-- DuelForge progression / economy / leaderboard
-- Run this once in Supabase SQL Editor. Never put a service-role key in the browser.

create extension if not exists pgcrypto;

create table if not exists public.duelforge_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'PLAYER' check (char_length(display_name) between 2 and 14),
  coins bigint not null default 500 check (coins >= 0),
  xp bigint not null default 0 check (xp >= 0),
  rank integer not null default 1 check (rank >= 1),
  mp_wins integer not null default 0 check (mp_wins >= 0),
  mp_losses integer not null default 0 check (mp_losses >= 0),
  bot_wins integer not null default 0 check (bot_wins >= 0),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.duelforge_catalog (
  id text primary key,
  category text not null check (category in ('armor','power','weapon_skin','cosmetic','effect')),
  name text not null,
  price bigint not null check (price >= 0),
  upgrade_base_cost bigint not null default 0 check (upgrade_base_cost >= 0),
  max_level integer not null default 5 check (max_level between 1 and 20),
  stats jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);

create table if not exists public.duelforge_player_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.duelforge_catalog(id) on delete restrict,
  level integer not null default 1 check (level between 1 and 20),
  equipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,item_id)
);

create table if not exists public.duelforge_reward_claims (
  match_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  coins integer not null check (coins >= 0),
  xp integer not null check (xp >= 0),
  created_at timestamptz not null default now(),
  primary key (match_id,user_id)
);

create index if not exists duelforge_player_items_user_idx on public.duelforge_player_items(user_id);
create index if not exists duelforge_profiles_wins_idx on public.duelforge_profiles(mp_wins desc, mp_losses asc);

alter table public.duelforge_profiles enable row level security;
alter table public.duelforge_catalog enable row level security;
alter table public.duelforge_player_items enable row level security;
alter table public.duelforge_reward_claims enable row level security;

drop policy if exists "profile self select" on public.duelforge_profiles;
create policy "profile self select" on public.duelforge_profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profile self update" on public.duelforge_profiles;
create policy "profile self update" on public.duelforge_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "catalog authenticated read" on public.duelforge_catalog;
create policy "catalog authenticated read" on public.duelforge_catalog for select to authenticated using (true);

drop policy if exists "items self read" on public.duelforge_player_items;
create policy "items self read" on public.duelforge_player_items for select to authenticated using (user_id = auth.uid());
-- No client insert/update/delete policies: mutations happen through SECURITY DEFINER RPCs.

drop policy if exists "claims self read" on public.duelforge_reward_claims;
create policy "claims self read" on public.duelforge_reward_claims for select to authenticated using (user_id = auth.uid());

create or replace function public.duelforge_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists duelforge_profiles_touch on public.duelforge_profiles;
create trigger duelforge_profiles_touch before update on public.duelforge_profiles
for each row execute function public.duelforge_touch_updated_at();

drop trigger if exists duelforge_items_touch on public.duelforge_player_items;
create trigger duelforge_items_touch before update on public.duelforge_player_items
for each row execute function public.duelforge_touch_updated_at();

create or replace function public.duelforge_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.duelforge_profiles(id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created_duelforge on auth.users;
create trigger on_auth_user_created_duelforge
after insert on auth.users
for each row execute function public.duelforge_new_user();

-- Backfill accounts that existed before this trigger was installed.
insert into public.duelforge_profiles(id) select id from auth.users on conflict (id) do nothing;

insert into public.duelforge_catalog(id,category,name,price,upgrade_base_cost,max_level,stats,sort_order) values
('armor_shadow','armor','Shadow Armor',250,180,5,'{"dashEfficiency":0.08,"speed":0.04}',10),
('armor_royal','armor','Royal Armor',350,240,5,'{"defense":0.05,"power":0.05}',20),
('armor_inferno','armor','Inferno Armor',400,280,5,'{"power":0.10,"defense":-0.02}',30),
('armor_frost','armor','Frost Armor',400,280,5,'{"defense":0.10,"speed":-0.02}',40),
('power_berserk','power','Berserk',300,220,5,'{"type":"berserk","damage":0.18,"duration":2.2,"cooldown":8}',10),
('power_shield','power','Shield',300,220,5,'{"type":"shield","defense":0.35,"duration":2.0,"cooldown":9}',20),
('power_lightning','power','Lightning',450,300,5,'{"type":"lightning","damage":26,"range":180,"cooldown":7}',30),
('power_blood_rush','power','Blood Rush',325,230,5,'{"type":"bloodrush","speed":0.28,"duration":2.0,"cooldown":8}',40),
('power_shadow_step','power','Shadow Step',375,260,5,'{"type":"shadowstep","distance":115,"cooldown":6}',50),
('skin_ember','weapon_skin','Ember Edge',200,0,1,'{"accent":"#ff5a3c"}',10),
('skin_frost','weapon_skin','Frost Edge',200,0,1,'{"accent":"#9bdcff"}',20),
('cosmetic_crown','cosmetic','Warden Crown',250,150,3,'{"style":"crown"}',10),
('effect_void','effect','Void Impact',300,180,3,'{"style":"void"}',10)
on conflict (id) do update set category=excluded.category,name=excluded.name,price=excluded.price,
upgrade_base_cost=excluded.upgrade_base_cost,max_level=excluded.max_level,stats=excluded.stats,sort_order=excluded.sort_order;

create or replace function public.duelforge_get_progress()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); p public.duelforge_profiles; items jsonb;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.duelforge_profiles(id) values(uid) on conflict(id) do nothing;
  select * into p from public.duelforge_profiles where id=uid;
  select coalesce(jsonb_agg(jsonb_build_object('id',i.item_id,'level',i.level,'equipped',i.equipped)), '[]'::jsonb)
    into items from public.duelforge_player_items i where i.user_id=uid;
  return jsonb_build_object('profile',to_jsonb(p),'items',items);
end $$;

create or replace function public.duelforge_purchase_item(p_item_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); c public.duelforge_catalog; p public.duelforge_profiles;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into c from public.duelforge_catalog where id=p_item_id;
  if not found then raise exception 'item not found'; end if;
  insert into public.duelforge_profiles(id) values(uid) on conflict(id) do nothing;
  if exists(select 1 from public.duelforge_player_items where user_id=uid and item_id=p_item_id) then raise exception 'already owned'; end if;
  select * into p from public.duelforge_profiles where id=uid for update;
  if p.coins < c.price then raise exception 'not enough coins'; end if;
  update public.duelforge_profiles set coins=coins-c.price where id=uid;
  insert into public.duelforge_player_items(user_id,item_id,level,equipped) values(uid,p_item_id,1,false);
  return public.duelforge_get_progress();
end $$;

create or replace function public.duelforge_upgrade_item(p_item_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); c public.duelforge_catalog; i public.duelforge_player_items; p public.duelforge_profiles; cost bigint;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into c from public.duelforge_catalog where id=p_item_id;
  select * into i from public.duelforge_player_items where user_id=uid and item_id=p_item_id for update;
  if not found then raise exception 'item not owned'; end if;
  if i.level >= c.max_level then raise exception 'max level reached'; end if;
  cost := c.upgrade_base_cost * i.level;
  select * into p from public.duelforge_profiles where id=uid for update;
  if p.coins < cost then raise exception 'not enough coins'; end if;
  update public.duelforge_profiles set coins=coins-cost where id=uid;
  update public.duelforge_player_items set level=level+1 where user_id=uid and item_id=p_item_id;
  return public.duelforge_get_progress();
end $$;

create or replace function public.duelforge_equip_item(p_item_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); cat text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select c.category into cat from public.duelforge_catalog c join public.duelforge_player_items i on i.item_id=c.id
   where c.id=p_item_id and i.user_id=uid;
  if cat is null then raise exception 'item not owned'; end if;
  update public.duelforge_player_items i set equipped=false
    where i.user_id=uid and i.item_id in (select id from public.duelforge_catalog where category=cat);
  update public.duelforge_player_items set equipped=true where user_id=uid and item_id=p_item_id;
  return public.duelforge_get_progress();
end $$;

create or replace function public.duelforge_set_profile(p_name text, p_settings jsonb default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); n text := upper(regexp_replace(trim(p_name),'[^A-Za-z0-9_ -]','','g'));
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if char_length(n)<2 or char_length(n)>14 then raise exception 'invalid name'; end if;
  insert into public.duelforge_profiles(id,display_name) values(uid,n) on conflict(id) do update
   set display_name=excluded.display_name, settings=case when p_settings is null then public.duelforge_profiles.settings else p_settings end;
  return public.duelforge_get_progress();
end $$;

create or replace function public.duelforge_claim_match(p_match_id uuid, p_won boolean, p_rounds integer, p_ranked boolean default true)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); coins_gain integer; xp_gain integer; p public.duelforge_profiles;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_rounds < 0 or p_rounds > 7 then raise exception 'invalid match'; end if;
  if exists(select 1 from public.duelforge_reward_claims where match_id=p_match_id and user_id=uid) then
    return public.duelforge_get_progress();
  end if;
  -- P2P combat cannot be cryptographically verified by Supabase; this function prevents
  -- replay/duplicate claims and caps the client-controlled reward.
  coins_gain := least(220, greatest(0, (case when p_won then 150 else 50 end) + least(p_rounds,7)*10));
  xp_gain := least(300, greatest(0, (case when p_won then 120 else 40 end) + least(p_rounds,7)*20));
  insert into public.duelforge_profiles(id) values(uid) on conflict(id) do nothing;
  update public.duelforge_profiles set
    coins=coins+coins_gain,
    xp=xp+xp_gain,
    mp_wins=mp_wins + case when p_ranked and p_won then 1 else 0 end,
    mp_losses=mp_losses + case when p_ranked and not p_won then 1 else 0 end,
    bot_wins=bot_wins + case when not p_ranked and p_won then 1 else 0 end,
    rank=greatest(1, 1 + ((mp_wins + case when p_ranked and p_won then 1 else 0 end)/10))
  where id=uid;
  insert into public.duelforge_reward_claims(match_id,user_id,coins,xp) values(p_match_id,uid,coins_gain,xp_gain);
  return public.duelforge_get_progress();
end $$;

create or replace function public.duelforge_leaderboard()
returns table(display_name text, mp_wins integer, mp_losses integer, rank integer)
language sql security definer set search_path=public as $$
  select display_name,mp_wins,mp_losses,rank from public.duelforge_profiles
  order by mp_wins desc, mp_losses asc, display_name asc limit 100;
$$;

grant execute on function public.duelforge_get_progress() to authenticated;
grant execute on function public.duelforge_purchase_item(text) to authenticated;
grant execute on function public.duelforge_upgrade_item(text) to authenticated;
grant execute on function public.duelforge_equip_item(text) to authenticated;
grant execute on function public.duelforge_set_profile(text,jsonb) to authenticated;
grant execute on function public.duelforge_claim_match(uuid,boolean,integer,boolean) to authenticated;
grant execute on function public.duelforge_leaderboard() to authenticated;
