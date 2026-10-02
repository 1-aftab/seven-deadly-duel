/* DuelForge progression: Supabase-backed profile, inventory, store and combat modifiers. */
(function(){
'use strict';
const DF=window.DF=window.DF||{}, S=()=>DF.Supabase;
const CATALOG={
 armor_shadow:{category:'armor',name:'Shadow Armor',price:250,upgrade:180,max:5,desc:'Movement and dash efficiency',stats:{dashEfficiency:.08,speed:.04}},
 armor_royal:{category:'armor',name:'Royal Armor',price:350,upgrade:240,max:5,desc:'Balanced defense and power',stats:{defense:.05,power:.05}},
 armor_inferno:{category:'armor',name:'Inferno Armor',price:400,upgrade:280,max:5,desc:'Stronger power attacks',stats:{power:.10,defense:-.02}},
 armor_frost:{category:'armor',name:'Frost Armor',price:400,upgrade:280,max:5,desc:'Improved defense',stats:{defense:.10,speed:-.02}},
 power_berserk:{category:'power',name:'Berserk',price:300,upgrade:220,max:5,desc:'Temporary damage boost',stats:{type:'berserk',damage:.18,duration:2.2,cooldown:8}},
 power_shield:{category:'power',name:'Shield',price:300,upgrade:220,max:5,desc:'Temporary damage reduction',stats:{type:'shield',defense:.35,duration:2,cooldown:9}},
 power_lightning:{category:'power',name:'Lightning',price:450,upgrade:300,max:5,desc:'Long-range special strike',stats:{type:'lightning',damage:26,range:180,cooldown:7}},
 power_blood_rush:{category:'power',name:'Blood Rush',price:325,upgrade:230,max:5,desc:'Temporary speed boost',stats:{type:'bloodrush',speed:.28,duration:2,cooldown:8}},
 power_shadow_step:{category:'power',name:'Shadow Step',price:375,upgrade:260,max:5,desc:'Instant combat footwork',stats:{type:'shadowstep',distance:115,cooldown:6}},
 skin_ember:{category:'weapon_skin',name:'Ember Edge',price:200,upgrade:0,max:1,desc:'Crimson weapon accent',stats:{accent:'#ff5a3c'}},
 skin_frost:{category:'weapon_skin',name:'Frost Edge',price:200,upgrade:0,max:1,desc:'Frost weapon accent',stats:{accent:'#9bdcff'}},
 cosmetic_crown:{category:'cosmetic',name:'Warden Crown',price:250,upgrade:150,max:3,desc:'Royal head cosmetic',stats:{}},
 effect_void:{category:'effect',name:'Void Impact',price:300,upgrade:180,max:3,desc:'Dark impact effect',stats:{}}
};
const P={profile:{id:null,display_name:'PLAYER',coins:500,xp:0,rank:1,mp_wins:0,mp_losses:0,bot_wins:0,settings:{}},items:[]};
let ready=false, loading=false, loadPromise=null;
function notify(){try{DF.Progression&&DF.Progression.onChange&&DF.Progression.onChange(P)}catch(e){}}
function merge(payload){if(!payload)return;const p=payload.profile||{};Object.assign(P.profile,p);P.items=payload.items||[];ready=true;render();notify();}
async function rpc(name,args){const s=S();if(!s)throw Error('Supabase is not configured.');const {data,error}=await s.rpc(name,args||{});if(error)throw error;return data}
async function load(){if(loading)return loadPromise;loading=true;loadPromise=(async()=>{try{const s=S();const ses=await s.auth.getSession();const uid=ses&&ses.data&&ses.data.session&&ses.data.session.user&&ses.data.session.user.id;if(!uid)throw Error('not authenticated');const data=await rpc('duelforge_get_progress');merge(data);localStorage.setItem('duelforge.cachedProgress.'+uid,JSON.stringify(P));return data}catch(e){console.warn('Progression load failed:',e);throw e}})();try{return await loadPromise}finally{loading=false;loadPromise=null}}
function owned(id){return P.items.find(x=>x.id===id)}
function item(id){return CATALOG[id]||null}
function levelStats(c,l){const k=Math.max(0,l-1);const out={};for(const x in c.stats)out[x]=typeof c.stats[x]==='number'?c.stats[x]*(1+k*.22):c.stats[x];return out}
function combat(){let armor=null,power=null,weaponSkin=null,effect=null,cosmetic=null;for(const it of P.items){if(!it.equipped)continue;const c=item(it.id);if(!c)continue;const x={id:it.id,level:it.level,stats:levelStats(c,it.level)};if(c.category==='armor')armor=x;else if(c.category==='power')power=x;else if(c.category==='weapon_skin')weaponSkin=x;else if(c.category==='effect')effect=x;else if(c.category==='cosmetic')cosmetic=x}return {armor,power,weaponSkin,effect,cosmetic}}
function catalogRows(){return Object.entries(CATALOG).map(([id,c])=>({id,...c}))}
async function buy(id){const data=await rpc('duelforge_purchase_item',{p_item_id:id});merge(data);return true}
async function upgrade(id){const data=await rpc('duelforge_upgrade_item',{p_item_id:id});merge(data);return true}
async function equip(id){const data=await rpc('duelforge_equip_item',{p_item_id:id});merge(data);return true}
async function setName(name,settings){const data=await rpc('duelforge_set_profile',{p_name:name,p_settings:settings||null});merge(data)}
async function setSettings(settings){const data=await rpc('duelforge_set_profile',{p_name:P.profile.display_name||'PLAYER',p_settings:settings||{}});merge(data)}
async function claim(matchId,won,rounds,ranked){const data=await rpc('duelforge_claim_match',{p_match_id:matchId,p_won:!!won,p_rounds:rounds|0,p_ranked:!!ranked});merge(data);return true}
async function leaderboard(){return await rpc('duelforge_leaderboard')}
function inject(){if(document.getElementById('store'))return;
 const home=document.querySelector('.menu');if(home){
  const mk=(id,ico,title,sub)=>{const b=document.createElement('button');b.className='mbtn';b.id=id;b.innerHTML=`<span class="ico">${ico}</span><span class="lbl"><b>${title}</b><small>${sub}</small></span><span class="chev">›</span>`;return b};
  home.append(mk('storeBtn','⚒','Store / Forge','Buy, upgrade and equip gear'));
  home.append(mk('profileBtn','♜','Player Profile','XP, rank and inventory'));
 }
 const frag=document.createElement('div');frag.innerHTML=`
 <section id="store" class="screen"><div class="sub-screen"><header class="sub-head"><button class="back" data-home>‹</button><h2>Store / Forge</h2></header>
 <div class="forge-top"><div><small class="cap">COINS</small><b id="storeCoins">500</b></div><div><small class="cap">FORGE</small><span>Buy → Upgrade → Equip</span></div></div><div id="storeGrid" class="store-grid"></div><div id="storeMsg" class="message"></div></div></section>
 <section id="profile" class="screen"><div class="sub-screen"><header class="sub-head"><button class="back" data-home>‹</button><h2>Player Profile</h2></header>
 <div class="profile-card"><div class="avatar profile-avatar" id="profileAvatar">P</div><div><b id="profileName">PLAYER</b><small id="profileRank">RANK 1</small></div></div>
 <div class="profile-stats"><div><b id="profileXp">0</b><small>XP</small></div><div><b id="profileWins">0</b><small>WINS</small></div><div><b id="profileLosses">0</b><small>LOSSES</small></div></div>
 <h3>Equipped</h3><div id="equippedList" class="equip-list"></div></div></section>`;
 document.body.append(...frag.children);
 document.getElementById('storeBtn').onclick=()=>{if(DF.show)DF.show('store')};
 document.getElementById('profileBtn').onclick=()=>{if(DF.show)DF.show('profile')};
 document.querySelectorAll('#store [data-home],#profile [data-home]').forEach(b=>b.onclick=()=>DF.show&&DF.show('home'));
 const set=document.querySelector('#settings .card.list');if(set){const row=document.createElement('div');row.className='set-row';row.innerHTML='<div><b>Account</b><small>Sign out on this device</small></div><button class="secondary" id="logoutBtn">LOG OUT</button>';set.appendChild(row);row.querySelector('#logoutBtn').onclick=async()=>{try{if(S())await S().auth.signOut()}finally{P.profile={id:null,display_name:'PLAYER',coins:500,xp:0,rank:1,mp_wins:0,mp_losses:0,bot_wins:0,settings:{}};P.items=[];ready=false;DF.show&&DF.show('authScreen')}}}
}
function render(){
 const p=P.profile;const sc=document.getElementById('storeCoins');if(sc)sc.textContent=(p.coins||0).toLocaleString();
 const pn=document.getElementById('profileName');if(pn)pn.textContent=p.display_name||'PLAYER';
 const pa=document.getElementById('profileAvatar');if(pa)pa.textContent=(p.display_name||'?')[0];
 const pr=document.getElementById('profileRank');if(pr)pr.textContent='RANK '+(p.rank||1);
 const xp=document.getElementById('profileXp');if(xp)xp.textContent=p.xp||0;
 const wi=document.getElementById('profileWins');if(wi)wi.textContent=p.mp_wins||0;
 const lo=document.getElementById('profileLosses');if(lo)lo.textContent=p.mp_losses||0;
 const el=document.getElementById('equippedList');if(el)el.innerHTML=catalogRows().filter(c=>{const i=owned(c.id);return i&&i.equipped}).map(c=>`<div><b>${c.name}</b><small>Level ${owned(c.id).level} · ${c.category}</small></div>`).join('')||'<small>Nothing equipped yet.</small>';
 const g=document.getElementById('storeGrid');if(!g)return;
 g.innerHTML=catalogRows().map(c=>{const i=owned(c.id),lv=i?i.level:0,cost=i?c.upgrade*lv:c.price,max=lv>=c.max;
  return `<article class="store-item ${i?'owned':''}"><div class="store-cat">${c.category.replace('_',' ')}</div><h3>${c.name}</h3><p>${c.desc}</p><div class="store-level">${i?`LEVEL ${lv}/${c.max}`:'LOCKED'}</div><small>${i&&c.upgrade?`Next level: +${Math.round((levelStats(c,lv+1).damage||levelStats(c,lv+1).defense||levelStats(c,lv+1).speed||0)*100)}% · Upgrade ${cost}`:'Price '+c.price}</small><div class="store-actions"><button data-act="${i?(max?'equip':'upgrade'):'buy'}" data-id="${c.id}" class="${i&&i.equipped?'secondary':'primary'}">${i?(max?(i.equipped?'EQUIPPED':'EQUIP'):'UPGRADE '+cost):'BUY '+c.price}</button></div></article>`}).join('');
 g.querySelectorAll('button').forEach(b=>b.onclick=async()=>{const msg=document.getElementById('storeMsg');b.disabled=true;try{if(b.dataset.act==='buy')await buy(b.dataset.id);else if(b.dataset.act==='upgrade')await upgrade(b.dataset.id);else await equip(b.dataset.id);msg.className='message';msg.textContent='Forge updated.'}catch(e){msg.className='message bad';msg.textContent=e.message||'Forge action failed.'}finally{b.disabled=false;render()}});
}
inject();DF.Progression={state:P,catalog:CATALOG,load,owned,item,combat,setName,setSettings,claim,leaderboard,buy,upgrade,equip,ready:()=>ready,onChange:null};
window.addEventListener('DOMContentLoaded',load);
})();
