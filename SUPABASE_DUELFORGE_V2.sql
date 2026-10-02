-- DuelForge V2 migration: profile customization, shared leaderboard IDs, friends and duel requests.
-- Run this AFTER SUPABASE_DUELFORGE.sql. Safe to run more than once.

alter table public.duelforge_profiles add column if not exists bio text not null default '' check (char_length(bio) <= 240);
alter table public.duelforge_profiles add column if not exists showcase_weapon text not null default 'sword';

-- Replace the profile RPC so bio/showcase persist without trusting arbitrary fields.
drop function if exists public.duelforge_set_profile(text,jsonb);
create or replace function public.duelforge_set_profile(
  p_name text,
  p_settings jsonb default null,
  p_bio text default null,
  p_showcase_weapon text default null
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); n text := upper(regexp_replace(trim(p_name),'[^A-Za-z0-9_ -]','','g')); b text := left(coalesce(p_bio,''),240); w text := coalesce(p_showcase_weapon,'sword');
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if char_length(n)<2 or char_length(n)>14 then raise exception 'invalid name'; end if;
  if w not in ('sword','dagger','hammer','spear','axe','katana','greatblade') then w:='sword'; end if;
  insert into public.duelforge_profiles(id,display_name,bio,showcase_weapon)
  values(uid,n,b,w)
  on conflict(id) do update set display_name=excluded.display_name,
    settings=case when p_settings is null then public.duelforge_profiles.settings else p_settings end,
    bio=excluded.bio, showcase_weapon=excluded.showcase_weapon;
  return public.duelforge_get_progress();
end $$;
grant execute on function public.duelforge_set_profile(text,jsonb,text,text) to authenticated;

-- Include the account ID so the browser can de-duplicate names correctly.
drop function if exists public.duelforge_leaderboard();
create or replace function public.duelforge_leaderboard()
returns table(id uuid, display_name text, mp_wins integer, mp_losses integer, rank integer)
language sql security definer set search_path=public as $$
  select p.id,p.display_name,p.mp_wins,p.mp_losses,p.rank
  from public.duelforge_profiles p
  order by p.mp_wins desc,p.mp_losses asc,p.display_name asc,p.id asc
  limit 100;
$$;
grant execute on function public.duelforge_leaderboard() to authenticated;

create table if not exists public.duelforge_friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(from_user <> to_user)
);
create index if not exists duelforge_friend_requests_to_idx on public.duelforge_friend_requests(to_user,status);
create index if not exists duelforge_friend_requests_from_idx on public.duelforge_friend_requests(from_user,status);

create table if not exists public.duelforge_friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,friend_id),
  check(user_id <> friend_id)
);
create index if not exists duelforge_friends_friend_idx on public.duelforge_friends(friend_id);

create table if not exists public.duelforge_duel_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  room_code text not null check(room_code ~ '^[0-9]{4}$'),
  status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(from_user <> to_user)
);
create index if not exists duelforge_duel_requests_to_idx on public.duelforge_duel_requests(to_user,status,created_at desc);

alter table public.duelforge_friend_requests enable row level security;
alter table public.duelforge_friends enable row level security;
alter table public.duelforge_duel_requests enable row level security;

create or replace function public.duelforge_search_players(p_query text)
returns table(id uuid,display_name text,mp_wins integer,mp_losses integer)
language sql security definer set search_path=public as $$
  select p.id,p.display_name,p.mp_wins,p.mp_losses
  from public.duelforge_profiles p
  where p.id <> auth.uid() and lower(p.display_name) like '%'||lower(trim(p_query))||'%'
  order by p.display_name asc limit 20;
$$;


grant execute on function public.duelforge_search_players(text) to authenticated;

create or replace function public.duelforge_send_friend_request(p_display_name text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); target uuid; old_id uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select id into target from public.duelforge_profiles where upper(display_name)=upper(trim(p_display_name)) limit 1;
  if target is null then raise exception 'player not found'; end if;
  if target=uid then raise exception 'you cannot add yourself'; end if;
  if exists(select 1 from public.duelforge_friends where user_id=uid and friend_id=target) then raise exception 'already friends'; end if;
  if exists(select 1 from public.duelforge_friend_requests where from_user=uid and to_user=target and status='pending') then raise exception 'request already sent'; end if;
  if exists(select 1 from public.duelforge_friend_requests where from_user=target and to_user=uid and status='pending') then raise exception 'this player already requested you'; end if;
  insert into public.duelforge_friend_requests(from_user,to_user) values(uid,target) returning id into old_id;
  return jsonb_build_object('id',old_id);
end $$;
grant execute on function public.duelforge_send_friend_request(text) to authenticated;

create or replace function public.duelforge_friend_requests()
returns table(id uuid,display_name text,mp_wins integer,mp_losses integer,created_at timestamptz)
language sql security definer set search_path=public as $$
  select r.id,p.display_name,p.mp_wins,p.mp_losses,r.created_at
  from public.duelforge_friend_requests r join public.duelforge_profiles p on p.id=r.from_user
  where r.to_user=auth.uid() and r.status='pending' order by r.created_at desc;
$$;
grant execute on function public.duelforge_friend_requests() to authenticated;

create or replace function public.duelforge_respond_friend_request(p_request_id uuid,p_accept boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.duelforge_friend_requests;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into r from public.duelforge_friend_requests where id=p_request_id and to_user=uid and status='pending' for update;
  if not found then raise exception 'request not found'; end if;
  if p_accept then
    update public.duelforge_friend_requests set status='accepted',updated_at=now() where id=r.id;
    insert into public.duelforge_friends(user_id,friend_id) values(uid,r.from_user) on conflict do nothing;
    insert into public.duelforge_friends(user_id,friend_id) values(r.from_user,uid) on conflict do nothing;
  else update public.duelforge_friend_requests set status='declined',updated_at=now() where id=r.id; end if;
  return jsonb_build_object('ok',true);
end $$;
grant execute on function public.duelforge_respond_friend_request(uuid,boolean) to authenticated;

create or replace function public.duelforge_friends()
returns table(id uuid,display_name text,mp_wins integer,mp_losses integer,bio text,showcase_weapon text)
language sql security definer set search_path=public as $$
  select p.id,p.display_name,p.mp_wins,p.mp_losses,p.bio,p.showcase_weapon
  from public.duelforge_friends f join public.duelforge_profiles p on p.id=f.friend_id
  where f.user_id=auth.uid() order by p.display_name asc;
$$;
grant execute on function public.duelforge_friends() to authenticated;

create or replace function public.duelforge_create_duel_request(p_friend_id uuid,p_room_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); rid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_room_code !~ '^[0-9]{4}$' then raise exception 'invalid room code'; end if;
  if not exists(select 1 from public.duelforge_friends where user_id=uid and friend_id=p_friend_id) then raise exception 'not friends'; end if;
  insert into public.duelforge_duel_requests(from_user,to_user,room_code) values(uid,p_friend_id,p_room_code) returning id into rid;
  return jsonb_build_object('id',rid);
end $$;
grant execute on function public.duelforge_create_duel_request(uuid,text) to authenticated;

create or replace function public.duelforge_duel_requests()
returns table(id uuid,display_name text,mp_wins integer,mp_losses integer,room_code text,created_at timestamptz)
language sql security definer set search_path=public as $$
  select d.id,p.display_name,p.mp_wins,p.mp_losses,d.room_code,d.created_at
  from public.duelforge_duel_requests d join public.duelforge_profiles p on p.id=d.from_user
  where d.to_user=auth.uid() and d.status='pending' order by d.created_at desc;
$$;
grant execute on function public.duelforge_duel_requests() to authenticated;

create or replace function public.duelforge_respond_duel_request(p_request_id uuid,p_accept boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); ok boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select exists(select 1 from public.duelforge_duel_requests where id=p_request_id and to_user=uid and status='pending') into ok;
  if not ok then raise exception 'duel request not found'; end if;
  update public.duelforge_duel_requests set status=case when p_accept then 'accepted' else 'declined' end,updated_at=now() where id=p_request_id;
  return jsonb_build_object('ok',true);
end $$;
grant execute on function public.duelforge_respond_duel_request(uuid,boolean) to authenticated;

-- Allow the original app's two-argument RPC to continue working through defaults.

-- Tighten RPC exposure: browser clients use the authenticated role only.
revoke execute on function public.duelforge_get_progress() from public;
revoke execute on function public.duelforge_purchase_item(text) from public;
revoke execute on function public.duelforge_upgrade_item(text) from public;
revoke execute on function public.duelforge_equip_item(text) from public;
revoke execute on function public.duelforge_set_profile(text,jsonb,text,text) from public;
revoke execute on function public.duelforge_claim_match(uuid,boolean,integer,boolean) from public;
revoke execute on function public.duelforge_leaderboard() from public;
revoke execute on function public.duelforge_search_players(text) from public;
revoke execute on function public.duelforge_send_friend_request(text) from public;
revoke execute on function public.duelforge_friend_requests() from public;
revoke execute on function public.duelforge_respond_friend_request(uuid,boolean) from public;
revoke execute on function public.duelforge_friends() from public;
revoke execute on function public.duelforge_create_duel_request(uuid,text) from public;
revoke execute on function public.duelforge_duel_requests() from public;
revoke execute on function public.duelforge_respond_duel_request(uuid,boolean) from public;

grant execute on function public.duelforge_get_progress() to authenticated;
grant execute on function public.duelforge_purchase_item(text) to authenticated;
grant execute on function public.duelforge_upgrade_item(text) to authenticated;
grant execute on function public.duelforge_equip_item(text) to authenticated;
grant execute on function public.duelforge_set_profile(text,jsonb,text,text) to authenticated;
grant execute on function public.duelforge_claim_match(uuid,boolean,integer,boolean) to authenticated;
grant execute on function public.duelforge_leaderboard() to authenticated;
grant execute on function public.duelforge_search_players(text) to authenticated;
grant execute on function public.duelforge_send_friend_request(text) to authenticated;
grant execute on function public.duelforge_friend_requests() to authenticated;
grant execute on function public.duelforge_respond_friend_request(uuid,boolean) to authenticated;
grant execute on function public.duelforge_friends() to authenticated;
grant execute on function public.duelforge_create_duel_request(uuid,text) to authenticated;
grant execute on function public.duelforge_duel_requests() to authenticated;
grant execute on function public.duelforge_respond_duel_request(uuid,boolean) to authenticated;
