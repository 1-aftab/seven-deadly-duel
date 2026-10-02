/* DuelForge — app shell, match controller, input, render loop, UI, online glue */
(function(){
'use strict';
const DF=window.DF,{FX,SFX,Arena,Net,WEAPONS,WEAPON_ORDER}=DF;
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

/* ================= profile / leaderboard (kept from MVP, now persisted) ================= */
const KEY='duelforge.v3';
const state={player:{name:'',mpWins:0,mpLosses:0,botWins:0,coins:500,characterId:null},muted:false,gfx:'auto',
 /* placeholder champions — a real shared board needs a server. Ranking = multiplayer duels only. */
 board:[]};
try{let s=JSON.parse(localStorage.getItem(KEY)||'null');
 if(s){Object.assign(state.player,s.player||{});state.muted=!!s.muted;if(s.gfx==='low')state.gfx='low'}
 else{const o=JSON.parse(localStorage.getItem('duelforge.v2')||'null');if(o&&o.player){state.player.wins=o.player.wins|0;state.player.coins=o.player.coins|0||500}}}catch(e){}
try{const c=localStorage.getItem('duelforge.character');if(DF.Characters?.valid(c))state.player.characterId=c}catch(e){}
/* migrate: older versions counted every win (incl. bots) as 'wins' — those are practice wins now and never ranked */
{const P=state.player;P.mpWins|=0;P.mpLosses|=0;P.botWins|=0;P.coins=Math.max(0,P.coins|0);P.xp=Math.max(0,P.xp|0);P.rank=Math.max(1,P.rank|0)}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({player:{name:state.player.name},muted:state.muted,gfx:state.gfx}))}catch(e){}};
 const syncCloud=()=>{const P=DF.Progression&&DF.Progression.state&&DF.Progression.state.profile;if(!P)return;state.player.name=P.display_name||state.player.name;state.player.coins=P.coins|0;state.player.xp=P.xp|0;state.player.rank=P.rank|0;state.player.mpWins=P.mp_wins|0;state.player.mpLosses=P.mp_losses|0;state.player.botWins=P.bot_wins|0;if(P.settings&&typeof P.settings==='object'){if(DF.Characters?.valid(P.settings.character_id))state.player.characterId=P.settings.character_id;}if(P.settings&&typeof P.settings==='object'){if(typeof P.settings.sound==='boolean')state.muted=!P.settings.sound;if(P.settings.gfx==='low'||P.settings.gfx==='auto')state.gfx=P.settings.gfx;SFX.muted=state.muted;} };
SFX.muted=state.muted;
DF.Progression&&(DF.Progression.onChange=()=>{syncCloud();updateHome();if(cur==='settings')updateSettings()});
const ico=(n,c)=>'<svg class="i '+(c||'')+'" aria-hidden="true"><use href="#i-'+n+'"/></svg>';

const screens=['splash','authScreen','nameScreen','characterScreen','home','mp','room','leaderboard','settings','store','profile','friends','duel','result'];
let cur='splash';
function show(id){cur=id;screens.forEach(s=>$(s).classList.toggle('active',s===id));document.body.classList.toggle('in-duel',id==='duel');
 if(id==='home')updateHome();if(id==='leaderboard')renderBoard();if(id==='settings')updateSettings();if(id!=='duel'){Match.active=false}window.scrollTo(0,0)}
DF.show=show;
const W=x=>x.mp_wins|0,Lo=x=>x.mp_losses|0;
function ranked(){const rows=[...state.board];const seen=new Set(),out=[];for(const x of rows){const key=x.id||String(x.name||'').toUpperCase();if(seen.has(key))continue;seen.add(key);out.push(x)}const meId=DF.Progression?.state?.profile?.id;if(meId&&!seen.has(meId))out.push({id:meId,name:state.player.name,mp_wins:state.player.mpWins,mp_losses:state.player.mpLosses});return out.sort((a,b)=>W(b)-W(a)||Lo(a)-Lo(b)||String(a.name||'').localeCompare(String(b.name||'')))}
const myRank=()=>{const id=DF.Progression?.state?.profile?.id;const all=ranked();const i=id?all.findIndex(x=>x.id===id):all.findIndex(x=>String(x.name).toUpperCase()===String(state.player.name).toUpperCase());return i<0?0:i+1};
function renderCharacters(){
 const grid=$('charGrid'),detail=$('charDetail');if(!grid||!DF.Characters)return;const current=state.player.characterId||DF.Characters.default;
 grid.innerHTML=DF.Characters.list.map(c=>`<button type="button" class="char-card ${c.id===current?'selected':''}" data-char="${c.id}"><img src="${c.asset}" alt="${escapeHtml(c.name)}"><span class="cn"><b>${escapeHtml(c.name)}</b><i class="dot" style="color:${c.color};background:${c.color}"></i></span><small>${escapeHtml(c.title)}</small></button>`).join('');
 grid.querySelectorAll('[data-char]').forEach(b=>b.onclick=()=>previewCharacter(b.dataset.char));previewCharacter(current);
}
function previewCharacter(id){
 if(!DF.Characters?.valid(id))return;const c=DF.Characters.get(id),detail=$('charDetail');if(!detail)return;state.player.characterId=id;
 const bar=(n,v)=>`<span>${n}</span><i style="--v:${v}% ;color:${c.color}"></i>`;
 detail.innerHTML=`<img src="${c.asset}" alt="${escapeHtml(c.name)}"><div><h3>${escapeHtml(c.name)} · ${escapeHtml(c.title)}</h3><p>${escapeHtml(c.desc)}</p><div class="char-bars">${bar('ATTACK',c.stats.attack)}${bar('DEFENSE',c.stats.defense)}${bar('SPEED',c.stats.speed)}${bar('SPECIAL',c.stats.special)}</div></div><button class="primary" id="charConfirm">${id===DF.Characters.selected()?'SELECTED':'SELECT FIGHTER'}</button>`;
 detail.querySelector('#charConfirm').onclick=()=>saveCharacter(id);document.querySelectorAll('.char-card').forEach(x=>x.classList.toggle('selected',x.dataset.char===id));
}
async function saveCharacter(id){
 const old=state.player.characterId;state.player.characterId=id;try{localStorage.setItem('duelforge.character',id)}catch(e){}
 try{if(DF.Progression?.ready?.())await DF.Progression.setCharacter(id);else if(DF.Progression?.state?.profile)DF.Progression.state.profile.settings=Object.assign({},DF.Progression.state.profile.settings||{},{character_id:id});show('home')}catch(e){state.player.characterId=old;const m=$('nameErr');if(m)m.textContent=e.message||'Could not save character.';return}
 updateHome();show('home');
}
function openCharacters(){renderCharacters();show('characterScreen')}

function updateHome(){const r=myRank();$('homeWins').textContent=state.player.mpWins;$('homeCoins').textContent=state.player.coins.toLocaleString();$('homeRank').textContent=r?'#'+r:'—';$('playerName').textContent=state.player.name||'PLAYER';$('avatar').textContent=(state.player.name||'?')[0];$('muteBtn').innerHTML=ico(state.muted?'mute':'vol');if(DF.Progression?.ready?.()&&cur==='home')DF.Progression.leaderboard().then(rows=>{state.board=(rows||[]).map(x=>({id:x.id,name:x.display_name,mp_wins:x.mp_wins|0,mp_losses:x.mp_losses|0,rank:x.rank|0}));if(cur==='home')$('homeRank').textContent=myRank()?'#'+myRank():'—'}).catch(()=>{})}
async function renderBoard(){
  const note=$('boardNote');
  try{
    if(DF.Progression)await DF.Progression.load();
    syncCloud();
    const P=state.player;
    $('meCard').innerHTML=`<span class="big">${myRank()?'#'+myRank():'—'}</span><div><b>${escapeHtml(P.name||'PLAYER')}</b><small>${P.mpWins} WINS · ${P.mpLosses} LOSSES · MULTIPLAYER</small></div>`;
    const rows=DF.Progression?await DF.Progression.leaderboard():[];
    state.board=(rows||[]).map(x=>({id:x.id,name:x.display_name,mp_wins:x.mp_wins|0,mp_losses:x.mp_losses|0,rank:x.rank|0}));
    const all=ranked();
    $('board').innerHTML='<div class="row header"><span>#</span><span>FIGHTER</span><span>WINS</span><span>LOSSES</span></div>'+
      (all.length?all.map((x,i)=>{const me=x.id&&x.id===DF.Progression?.state?.profile?.id;return `<div class="row ${me?'me':''}"><span class="rk ${i<3?'r'+(i+1):''}">${i+1}</span><span class="nm"><span class="avatar">${escapeHtml((x.name||'?')[0])}</span><b>${escapeHtml(x.name||'PLAYER')}</b>${me?'<span class="tag-npc">YOU</span>':''}</span><b>${W(x)}</b><b>${Lo(x)}</b></div>`}).join(''):'<div class="row"><span></span><span>No ranked players yet.</span><span>0</span><span>0</span></div>');
    if(note)note.textContent='Live Supabase leaderboard · shared across registered accounts and devices.';
  }catch(e){
    console.warn('Leaderboard load failed:',e);
    state.board=[];
    if(note)note.textContent='Leaderboard could not be loaded. Check that the Supabase DuelForge SQL was run successfully.';
    $('board').innerHTML='<div class="message bad">Could not load the shared leaderboard.</div>';
  }
} 

/* ================= input ================= */
const Input={left:false,right:false,j:0,a:0,d:0,h:0,
 dir(l,r){this.left=l;this.right=r;$('leftBtn').classList.toggle('on',l);$('rightBtn').classList.toggle('on',r)},
 press(k){this[k]++;SFX.init();SFX.resume()},tapDir(k){const now=performance.now(),key='tap_'+k,last=this[key]||0;this[key]=now;if(now-last<260){this.step++;SFX.ui()}},clear(){this.dir(false,false)}};
const KEYMAP={a:'L',arrowleft:'L',d:'R',arrowright:'R',w:'J',arrowup:'J',' ':'J',j:'A',k:'H',u:'H',l:'D',shift:'D'};
const held={L:false,R:false};
addEventListener('keydown',e=>{if(!Match.active)return;const k=KEYMAP[e.key.toLowerCase()];if(!k)return;e.preventDefault();
 if(k==='L'||k==='R'){if(!e.repeat)Input.tapDir(k);held[k]=true;Input.dir(held.L,held.R)}else if(!e.repeat)Input.press({J:'j',A:'a',D:'d',H:'h'}[k])});
addEventListener('keyup',e=>{const k=KEYMAP[e.key.toLowerCase()];if(k==='L'||k==='R'){held[k]=false;Input.dir(held.L,held.R)}});
addEventListener('blur',()=>{held.L=held.R=false;Input.clear()});
(function touch(){
 const dpad=$('dpad');let ptr=null;
 const upd=e=>{const r=dpad.getBoundingClientRect(),x=e.clientX-r.left;const l=x<r.width*.5;Input.dir(l,!l)};
 dpad.addEventListener('pointerdown',e=>{e.preventDefault();ptr=e.pointerId;try{dpad.setPointerCapture(ptr)}catch(x){}upd(e);const side=e.clientX<dpad.getBoundingClientRect().left+dpad.getBoundingClientRect().width*.5?'L':'R';Input.tapDir(side);SFX.init();SFX.resume()});
 dpad.addEventListener('pointermove',e=>{if(e.pointerId===ptr)upd(e)});
 const up=e=>{if(e.pointerId===ptr){ptr=null;Input.dir(held.L,held.R)}};dpad.addEventListener('pointerup',up);dpad.addEventListener('pointercancel',up);
 [['attackBtn','a'],['heavyBtn','h'],['jumpBtn','j'],['dashBtn','d']].forEach(([id,k])=>{const b=$(id);
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('down');Input.press(k)});
  const off=()=>b.classList.remove('down');b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off)});
 const duel=$('duel');duel.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});duel.addEventListener('touchstart',e=>{if(!e.target.closest('#pauseMenu,#picker'))e.preventDefault()},{passive:false});
 duel.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('gesturestart',e=>e.preventDefault());
 const coarse=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0||'ontouchstart' in window;document.body.classList.toggle('touch',coarse);
})();

/* ================= view / render ================= */
const canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
const lowEnd=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=2;
let view=null,cam={z:1},qual=0,ema=.0167,seen=0,autoLow=false,capMs=0;
const baseQual=()=>state.gfx==='low'?2:lowEnd?1:0;
function applyGfx(){const low=state.gfx==='low'||autoLow;FX.max=low?60:140;Arena.lite=low;capMs=state.gfx==='low'?33:0;document.body.classList.toggle('lowfx',low)}
function resize(){const cw=innerWidth,ch=innerHeight;if(!cw||!ch)return;let r=Math.min(devicePixelRatio||1,2)*Math.pow(.75,qual);const cap=(lowEnd||qual>=1)?960:1280;if(cw*r>cap)r=cap/cw;
 canvas.width=Math.max(2,Math.round(cw*r));canvas.height=Math.max(2,Math.round(ch*r));const S=Math.min(canvas.width/960,canvas.height/540);
 view={cw:canvas.width,ch:canvas.height,S,halfW:canvas.width/(2*S),halfH:canvas.height/(2*S)};Arena.build(view)}
let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(Match.active)resize()},120)});
addEventListener('orientationchange',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(Match.active)resize()},300)});

function render(){
 const v=view,z=cam.z,S=v.S*z,m=Match,p1=m.p1,p2=m.p2;
 ctx.setTransform(S,0,0,S,v.cw/2-480*S+FX.shakeX*v.S,v.ch/2-270*S+FX.shakeY*v.S);
 const par=clamp(((p1.x+p2.x)/2-480)/480,-1,1);
 Arena.draw(ctx,par);
 p1.drawShadow(ctx);p2.drawShadow(ctx);p1.drawGhosts(ctx);p2.drawGhosts(ctx);
 const first=(p1.mode==='attack'||p1.mode==='win')?p2:p1,second=first===p1?p2:p1;
 first.draw(ctx);second.draw(ctx);first.drawTrail(ctx);second.drawTrail(ctx);
 FX.draw(ctx);Arena.drawFront(ctx,par);
 ctx.setTransform(1,0,0,1,0,0);if(!Arena.lite)ctx.drawImage(Arena.vig,0,0);
}
let last=0,raf=0;
function frame(now){if(!Match.active){raf=0;return}raf=requestAnimationFrame(frame);if(capMs&&now-last<capMs-3)return;let dt=(now-last)/1000;last=now;if(!(dt>0))return;if(dt>.05)dt=.05;Match.update(dt);render();
 if(!Match.paused&&!capMs){ema=ema*.95+dt*.05;if(++seen>120&&ema>.027){seen=0;ema=.0167;if(qual<2){qual++;resize()}else if(!autoLow){autoLow=true;applyGfx()}}}}

/* ================= HUD helpers ================= */
const hudCache={};
function setBar(side,hp){const k=side+'hp';if(hudCache[k]===hp)return;hudCache[k]=hp;const v=clamp(hp/100,0,1);
 $(side+'Hp').style.transform=`scaleX(${v})`;$(side+'Ghost').style.transform=`scaleX(${v})`;$(side+'HpText').textContent=Math.max(0,Math.ceil(hp));
 $(side+'Hp').parentNode.classList.toggle('low',hp<=30)}
function setPips(side,n){const el=$(side+'Pips');if(!el.children.length)for(let i=0;i<4;i++)el.appendChild(document.createElement('i'));
 [...el.children].forEach((p,i)=>p.classList.toggle('on',i<n))}
const cdAtk=$('attackBtn').querySelector('.cd'),cdPow=$('heavyBtn').querySelector('.cd'),HVCD=DF.HVCD;
function setCds(f){const a=f.atkCd>0?clamp(f.atkCd/f.atkCdMax(),0,1):0,pow=f.mods&&f.mods.power&&f.mods.power.stats,h=pow?(f.powerCd>0?clamp(f.powerCd/(pow.cooldown||8),0,1):0):(f.hvCd>0?clamp(f.hvCd/HVCD,0,1):0),qa=Math.round(a*24),qh=Math.round(h*24);
 if(hudCache.qa!==qa){hudCache.qa=qa;const s=qa/24;$('cdA').style.transform='scaleX('+(1-s)+')';cdAtk.style.transform='scaleY('+s+')'}
 if(hudCache.qh!==qh){hudCache.qh=qh;const s=qh/24;$('cdH').style.transform='scaleX('+(1-s)+')';cdPow.style.transform='scaleY('+s+')';$('heavyBtn').classList.toggle('ready',qh===0)}}
function banner(main,sub,cls){const b=$('banner');$('bannerMain').textContent=main;$('bannerSub').textContent=sub||'';b.className='';void b.offsetWidth;b.className='show '+(cls||'')}
function weaponCard(who,w,cls){const s=w.stats,bar=(l,v)=>`<div class="st"><label>${l}</label><span><i style="--v:${v.toFixed(2)}"></i></span></div>`;
 return`<div class="wcard ${cls}"><small>${escapeHtml(who)}</small><b>${w.name}</b>${bar('DMG',s.dmg)}${bar('SPD',s.spd)}${bar('RNG',s.rng)}</div>`}
function flashScreen(){const f=$('hitFlash');f.classList.remove('go');void f.offsetWidth;f.classList.add('go')}


/* ================= weapon picker: every round, both fighters choose their arms ================= */
const PICK_TIME=12;
const Picker={built:false,on:false,sel:null,locked:false,opp:false,tShown:-1,
 build(){if(this.built)return;this.built=true;const g=$('pkGrid');
  WEAPON_ORDER.forEach((id,n)=>{const w=WEAPONS[id],st=w.stats,b=document.createElement('button');b.type='button';b.className='pk-card';b.dataset.w=id;
   const cv=document.createElement('canvas');cv.width=220;cv.height=100;const c=cv.getContext('2d'),k=200/(w.len+34);c.translate(10+22*k,50);c.scale(k,k);DF.drawWeapon(c,id,'#f0d28a',0);
   const bar=(l,v)=>`<div class="st"><label>${l}</label><span><i style="--v:${v.toFixed(2)}"></i></span></div>`;
   b.appendChild(cv);b.insertAdjacentHTML('beforeend',`<b><i class="pk-key">${n+1}</i>${w.name}</b>${bar('DMG',st.dmg)}${bar('SPD',st.spd)}${bar('RNG',st.rng)}`);
   b.onclick=()=>this.select(id);g.appendChild(b)});
  $('pkLock').onclick=()=>this.lock()},
 show(round,foe){this.build();this.on=true;this.sel=null;this.locked=false;this.opp=false;this.tShown=-1;
  $('picker').hidden=false;$('picker').classList.remove('locked');$('pkSub').textContent='ROUND '+round+' \u00b7 vs '+foe;
  $('pkLock').disabled=true;$('pkLock').textContent='LOCK IN';
  [...$('pkGrid').children].forEach(c=>c.classList.remove('sel'));this.status()},
 hide(){this.on=false;$('picker').hidden=true},
 select(id){if(!this.on||this.locked)return;this.sel=id;[...$('pkGrid').children].forEach(c=>c.classList.toggle('sel',c.dataset.w===id));$('pkLock').disabled=false;SFX.init();SFX.ui()},
 lock(){if(!this.on||this.locked||!this.sel)return;this.locked=true;$('picker').classList.add('locked');$('pkLock').disabled=true;$('pkLock').textContent='LOCKED IN';this.status();Match.onMyPick(this.sel)},
 autoLock(){if(!this.on||this.locked)return;if(!this.sel)this.select(WEAPON_ORDER[(Math.random()*WEAPON_ORDER.length)|0]);this.lock()},
 setOpp(v){this.opp=v;this.status()},
 status(){const e=$('pkStatus');e.className=this.opp?'ok':'';e.textContent=this.locked?(this.opp?'BOTH LOCKED IN':'WAITING FOR OPPONENT\u2026'):(this.opp?'OPPONENT LOCKED IN \u2014 YOUR MOVE':'OPPONENT IS CHOOSING\u2026')},
 tick(t){const s=Math.max(0,Math.ceil(t));if(s===this.tShown)return;this.tShown=s;const e=$('pkTimer');e.textContent=s;e.classList.toggle('low',s<=3)}
};
addEventListener('keydown',e=>{if(!Picker.on||!Match.active||Match.paused)return;const n=parseInt(e.key,10);
 if(n>=1&&n<=WEAPON_ORDER.length){Picker.select(WEAPON_ORDER[n-1]);e.preventDefault()}else if(e.key==='Enter'){Picker.lock();e.preventDefault()}},true);

/* ================= match ================= */
const Match={
 active:false,mode:'bot',me:0,matchId:null,phase:'none',phaseT:0,round:1,score:[0,0],rand:null,picks:[null,null],pickT:0,botWait:0,names:['AFTAB','ASHEN WARDEN'],
 p1:new DF.Fighter(0,'P1'),p2:new DF.Fighter(1,'P2'),bot:null,timeLeft:60,hitstop:0,slow:0,paused:false,netT:0,inT:0,lastIn:'',remote:{l:0,r:0,j:0,a:0,d:0,h:0},seen:[[0,0,0,0,0],[0,0,0,0,0]],ended:false,koShown:false,
 start(o){this.mode=o.mode;this.me=o.mode==='guest'?1:0;this.matchId=o.matchId||((crypto&&crypto.randomUUID)?crypto.randomUUID():'m_'+Date.now()+'_'+Math.random().toString(36).slice(2));this.names=o.names;this.p1.name=o.names[0];this.p2.name=o.names[1];this.p1.setCharacter(o.characters?.[0]||state.player.characterId||'shadow');this.p2.setCharacter(o.characters?.[1]||DF.Characters?.random?.(this.p1.characterId)||'frost');const localMods=DF.Progression?DF.Progression.combat():{};this.p1.mods=this.me===0?localMods:(this.p1.mods||{});this.p2.mods=this.me===1?localMods:(this.p2.mods||{});
  let s=(o.seed>>>0)||1;this.rand=()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  Picker.hide();Input.step=0;this.score=[0,0];this.round=1;this.picks=[null,null];this.bot=o.mode==='bot'?new DF.Bot(1):null;this.paused=false;this.ended=false;this.remote={l:0,r:0,j:0,a:0,d:0,h:0,st:0};this.seen=[[0,0,0,0,0],[0,0,0,0,0]];
  this.hitstop=0;this.slow=0;cam.z=1;FX.reset();qual=Math.max(qual,baseQual());applyGfx();$('pauseMenu').hidden=true;
  $('heroName').textContent=this.names[0];$('enemyName').textContent=this.names[1]+(o.mode==='guest'?' (YOU)':'');
  for(const k in hudCache)delete hudCache[k];setPips('hero',0);setPips('enemy',0);$('myRounds').textContent=$('botRounds').textContent='0';
  show('duel');this.active=true;Input.clear();resize();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
  SFX.init();SFX.resume();if(o.mode!=='guest')this.beginRound()},
 rollWeapon(){return WEAPON_ORDER[(Math.random()*WEAPON_ORDER.length)|0]},
 /* bot / host: open the weapon-pick phase. Picks are hidden until both fighters lock in, then revealed together. */
 beginRound(){this.picks=[null,null];this.enterPick();
  if(this.mode==='host')Net.send({t:'pstart',n:this.round,sc:this.score});
  if(this.mode==='bot')this.botWait=.8+Math.random()*1.4},
 enterPick(){this.phase='pick';this.phaseT=0;this.pickT=PICK_TIME;this.koShown=false;this.slow=0;this.hitstop=0;
  if(this.mode!=='guest'){this.p1.reset(300,1,this.p1.weapon);this.p2.reset(660,-1,this.p2.weapon)}
  FX.reset();Input.clear();$('intro').classList.remove('show');$('roundNo').textContent=this.round;
  $('heroWeapon').textContent=$('enemyWeapon').textContent='\u2014';this.hud();Picker.show(this.round,this.names[1-this.me]);SFX.ui()},
 onMyPick(id){if(this.mode==='guest')Net.send({t:'pick',n:this.round,w:id});else{this.picks[0]=id;if(this.mode==='host')Net.send({t:'lock'})}},
 setRemotePick(id){if(this.phase==='pick'&&WEAPONS[id]&&!this.picks[1]){this.picks[1]=id;Picker.setOpp(true)}},
 pickStep(dt){this.pickT-=dt;Picker.tick(this.pickT);
  if(this.mode==='bot'&&!this.picks[1]){this.botWait-=dt;if(this.botWait<=0){this.picks[1]=this.rollWeapon();Picker.setOpp(true)}}
  if(this.pickT<=0&&!Picker.locked)Picker.autoLock();
  if(this.mode!=='guest'&&((this.picks[0]&&this.picks[1])||this.pickT<=-1.2))this.resolvePick()},
 resolvePick(){const a=this.picks[0]||this.rollWeapon(),b=this.picks[1]||this.rollWeapon();this.applyRound(a,b);
  if(this.mode==='host')Net.send({t:'round',n:this.round,w:[a,b],sc:this.score})},
 applyRound(a,b){const w1=WEAPONS[a],w2=WEAPONS[b];this.p1.reset(300,1,w1);this.p2.reset(660,-1,w2);this.phase='intro';this.phaseT=0;this.timeLeft=60;this.koShown=false;this.slow=0;Picker.hide();
  FX.reset();Input.clear();
  $('roundNo').textContent=this.round;$('heroWeapon').textContent=w1.name;$('enemyWeapon').textContent=w2.name;this.hud();
  $('intro').innerHTML=weaponCard(this.names[0],w1,'l')+weaponCard(this.names[1],w2,'r');$('intro').classList.add('show');
  banner('ROUND '+this.round,w1.name+'  vs  '+w2.name,'long');SFX.ui()},
 startFight(){this.phase='fight';this.phaseT=0;$('intro').classList.remove('show');banner('FIGHT!','','fight');SFX.fight();
  if(this.mode!=='guest'){this.p1.setMode('free');this.p2.setMode('free')}if(this.mode==='host')Net.send({t:'ph',ph:'fight'})},
 /* decide round result (authoritative side) */
 endRound(winner,ko){if(this.phase!=='fight')return;const[a,b]=[this.p1,this.p2];
  if(winner>=0)this.score[winner]++;
  const W=winner===0?a:winner===1?b:null,Lz=winner===0?b:winner===1?a:null;
  if(W){W.setMode('win');W.atk=null;if(Lz.mode!=='ko')Lz.setMode('lose')}else{[a,b].forEach(f=>{if(f.mode!=='ko'){f.setMode('lose')}})}
  if(ko)this.slow=.9;
  this.showRoundEnd(winner,ko);
  if(this.mode==='host')Net.send({t:'ph',ph:'ko',w:winner,ko:ko?1:0,sc:this.score,r:this.round});
 },
 showRoundEnd(winner,ko){this.phase='ko';this.phaseT=0;this.koShown=false;this.ended=this.score[0]>=4||this.score[1]>=4;
  banner(winner<0?(ko?'DOUBLE K.O.':'DRAW'):ko?'K.O.!':'TIME!','','ko');if(ko){SFX.ko();flashScreen()}
  this.lastWinner=winner;this.hud()},
 finishRound(){if(this.ended){this.phase='end';this.phaseT=0;SFX.win();return}
  if(this.lastWinner>=0)this.round++;if(this.mode!=='guest')this.beginRound()},
 /* ---- gameplay callbacks (called by Fighter) ---- */
 onJump(f){FX.dust(f.x,412,4);SFX.jump()},onLand(f){FX.dust(f.x,412,5)},onDash(f){FX.dust(f.x,412,6,-f.dashDir);SFX.dash()},
 onAttackStart(f){if(f.atk&&f.atk.heavy)SFX.charge()},
onPower(f,type,st){
  if(this.mode==='host')Net.send({t:'power',s:f.side,x:Math.round(f.x),y:Math.round(f.y-70),type});
  FX.ring(f.x,f.y-70,f.pal.accent,type==='lightning'?110:70,.35);FX.sparks(f.x,f.y-65,f.facing,12,f.pal.accent,420);SFX.dash();FX.shake(type==='lightning'?3:1.5);
  if(type==='lightning'){
    const def=f===this.p1?this.p2:this.p1,range=st.range||180,dist=Math.abs(def.x-f.x);
    if(dist<=range&&def.mode!=='ko'){
      const defense=(def.mods?.armor?.stats?.defense||0)+(def.powerKind==='shield'&&def.powerT>0?(def.mods?.power?.stats?.defense||.35):0);
      const dmg=Math.max(1,Math.round((st.damage||26)*(1-Math.min(.45,defense))));def.hp=Math.max(0,def.hp-dmg);const dir=def.x>=f.x?1:-1,ko=def.hp<=0;if(ko)def.die(dir,80);else def.hurt(dir,80,60,.24);this.fxHit(f.side,def.x,def.y-70,dmg,ko,dir,true);if(this.mode==='host')Net.send({t:'powerHit',s:f.side,x:Math.round(def.x),y:Math.round(def.y-70),d:dmg,k:ko?1:0,dir});
    }
  }
},
 onSwing(f){const hv=f.atk&&f.atk.heavy;SFX.swing(f.weapon.dmg>=20||hv);if(hv){SFX.heavy();FX.shake(3);FX.ring(f.x+f.facing*40,f.y-60,f.pal.accent,70,.3)}},
 onSwingEnd(f){if(f.weapon.id==='hammer'||f.weapon.id==='greatblade'){const s=f.seg({});if(s.ty>380){FX.dust(s.tx,412,7);FX.ring(s.tx,410,'#e8d9b5',46,.3);FX.shake(f.weapon.id==='hammer'?3.5:2.5)}}},
 hud(){setPips('hero',this.score[0]);setPips('enemy',this.score[1]);$('myRounds').textContent=this.score[0];$('botRounds').textContent=this.score[1]},
 /* ---- hit resolution ---- */
 _s:{},_pv:{},
 hitCheck(att,def){
  if(att.mode!=='attack'||!att.atk||att.atk.phase!==1||att.atk.hit||def.inv>0||def.mode==='ko'||this.phase!=='fight')return null;
  if(att.atk.t<att.atk.S*.35)return null;
  const w=att.weapon,cur=att.seg(this._s),pv=att.prevSeg,th=w.thick*(att.atk.heavy?1.7:1);
  const x0=def.x-12-th*.5,x1=def.x+12+th*.5,y0=def.y-124-th*.4,y1=def.y-2;let hit=null;
  for(let s=0;s<=3&&!hit;s++){const k=s/3;
   const bx=pv?pv.bx+(cur.bx-pv.bx)*k:cur.bx,by=pv?pv.by+(cur.by-pv.by)*k:cur.by,tx=pv?pv.tx+(cur.tx-pv.tx)*k:cur.tx,ty=pv?pv.ty+(cur.ty-pv.ty)*k:cur.ty;
   for(let j=0;j<=6;j++){const u=j/6,px=bx+(tx-bx)*u,py=by+(ty-by)*u;if(px>x0&&px<x1&&py>y0&&py<y1){hit={x:px,y:py};break}}}
  if(!pv)att.prevSeg=this._pv;Object.assign(att.prevSeg,cur);return hit},
 applyHit(att,def,h){const w=att.weapon,hv=!!att.atk.heavy,defense=(def.mods&&def.mods.armor&&def.mods.armor.stats.defense||0)+(def.powerKind==='shield'&&def.powerT>0?(def.mods&&def.mods.power&&def.mods.power.stats.defense||.35):0),dmg=Math.max(1,Math.round(att.atk.dmg*(1-Math.min(.45,defense)))),kb=w.kb*(hv?1.5:1),up=w.up*(hv?1.3:1),dir=def.x>=att.x?1:-1;att.atk.hit=true;def.hp=Math.max(0,def.hp-dmg);
  const ko=def.hp<=0;if(ko)def.die(dir,kb);else def.hurt(dir,kb,def.grounded?up:up*.5,.22+kb/2200);
  this.fxHit(att.side,h.x,h.y,dmg,ko,dir,hv);if(this.mode==='host')Net.send({t:'hit',s:att.side,x:Math.round(h.x),y:Math.round(h.y),k:ko?1:0,d:dir,g:dmg,v:hv?1:0});return ko},
 fxHit(side,x,y,dmg,ko,dir,hv){const att=side?this.p2:this.p1,def=side?this.p1:this.p2,w=att.weapon,col=att.pal.accent,heavy=hv||w.dmg>=20;
  FX.sparks(x,y,dir,8+(dmg/3|0),col,420);FX.sparks(x,y,dir,5,'#ffffff',320);FX.flare(x,y,'#fff',24+dmg*.7);FX.ring(x,y,col,36+dmg);FX.shards(x,y,heavy?7:3,col);
  FX.float(def.x,def.y-135,'-'+dmg,'#fff');FX.shake(w.shake+(ko?4:0)+(hv?4:0));this.hitstop=Math.max(this.hitstop,w.stop+(ko?.1:0)+(hv?.06:0));def.shakeT=w.stop+.1;def.flash=.1;cam.z+=heavy?.03:.012;
  SFX.hit(heavy);if(heavy||ko)flashScreen();if(ko){FX.shards(x,y,16,col);FX.ring(x,y,'#fff',90,.4)}},
 /* ---- simulation ---- */
 simulate(h){const a=this.p1,b=this.p2;
  if(this.bot&&this.phase==='fight')this.bot.update(h,b,a);
  if(this.phase!=='fight'){a.input.left=a.input.right=b.input.left=b.input.right=false}
  a.logic(h,b,this);b.logic(h,a,this);
  const dx=b.x-a.x;if(Math.abs(dx)<36&&Math.abs(a.y-b.y)<70&&a.mode!=='ko'&&b.mode!=='ko'){const s=dx>=0?1:-1,p=(36-Math.abs(dx))/2;a.x=clamp(a.x-s*p,56,904);b.x=clamp(b.x+s*p,56,904)}
  a.animate(h);b.animate(h);
  const h1=this.hitCheck(a,b),h2=this.hitCheck(b,a);let k1=false,k2=false;
  if(h1)k1=this.applyHit(a,b,h1);if(h2)k2=this.applyHit(b,a,h2);
  a.pushTrail(h);b.pushTrail(h);
  if(this.phase==='fight'){this.timeLeft-=h;
   if(k1&&k2)this.endRound(-1,true);else if(k1)this.endRound(0,true);else if(k2)this.endRound(1,true);
   else if(this.timeLeft<=0){this.timeLeft=0;this.endRound(a.hp===b.hp?-1:a.hp>b.hp?0:1,false)}}},
 feed(f,st){f.input.left=!!st.l;f.input.right=!!st.r;const i=f.side,s=this.seen[i];
   if(st.j!==s[0]){s[0]=st.j;f.input.jump=.14}if(st.a!==s[1]){s[1]=st.a;f.input.attack=.14}if(st.d!==s[2]){s[2]=st.d;f.input.dash=.14}if(st.h!==s[3]){s[3]=st.h|0;f.input.heavy=.14}if(st.st!==undefined&&st.st!==s[4]){s[4]=st.st|0;f.input.step=.12}},
 update(dt){
  if(this.paused){return}
  this.phaseT+=dt;
  let sd=dt;if(this.hitstop>0){this.hitstop-=dt;sd=0}else if(this.slow>0){this.slow-=dt;sd=dt*.3}
  const mine={l:Input.left,r:Input.right,j:Input.j,a:Input.a,d:Input.d,h:Input.h,st:Input.step};
  if(this.mode==='guest'){
   this.inT+=dt;const sig=''+mine.l+mine.r+mine.j+mine.a+mine.d+mine.h+mine.st;if(sig!==this.lastIn||this.inT>.1){this.lastIn=sig;this.inT=0;Net.send({t:'in',l:+mine.l,r:+mine.r,j:mine.j,a:mine.a,d:mine.d,h:mine.h,st:mine.st})}
   if(sd>0){for(const f of[this.p1,this.p2]){f.guestTick(sd);f.animate(sd);f.pushTrail(sd)}}
  }else{
   this.feed(this.p1,mine);if(this.mode==='host')this.feed(this.p2,this.remote);
   let left=sd;while(left>0){const h=Math.min(left,.02);this.simulate(h);left-=h}
   if(this.mode==='host'){this.netT+=dt;if(this.netT>=1/30){this.netT=0;Net.send({t:'s',a:this.p1.serialize(),b:this.p2.serialize(),tm:Math.ceil(this.timeLeft)})}}
  }
  FX.update(dt);Arena.update(dt);cam.z+=(1+(this.slow>0?.05:0)-cam.z)*(1-Math.exp(-dt*7));
  // phase machine (host/bot drive it; guest follows events but runs the same timers for pure presentation)
  if(this.phase==='intro'&&this.phaseT>=1.8&&this.mode!=='guest')this.startFight();
  else if(this.phase==='pick')this.pickStep(dt);
  else if(this.phase==='ko'){if(!this.koShown&&this.phaseT>=1.5){this.koShown=true;const w=this.lastWinner,me=this.me;
     if(this.ended)banner(w===me?'VICTORY':'DEFEAT','','end');else banner(w<0?'DRAW':w===me?'ROUND WON':'ROUND LOST',this.score[0]+' — '+this.score[1],'round')}
    if(this.phaseT>=3.2&&this.mode!=='guest')this.finishRound();else if(this.phaseT>=3.2&&this.mode==='guest'&&this.ended){this.phase='end';this.phaseT=0}}
  else if(this.phase==='end'&&this.phaseT>=2.2){this.phase='done';this.finish()}
  // HUD
  setBar('hero',this.p1.hp);setBar('enemy',this.p2.hp);setCds(this.me?this.p2:this.p1);const tl=Math.ceil(this.timeLeft);if(hudCache.t!==tl){hudCache.t=tl;$('timer').textContent=tl;$('timer').classList.toggle('low',tl<=10)}
 },
 async finish(){if(this._finishing)return;this._finishing=true;if(this.mode==='host'||this.mode==='guest')this.rematchFlags={me:false,opp:false};
  const me=this.me,won=this.score[me]>=4,rw=this.score[me],base=won?150:50,coins=base+rw*10;
  const ranked=this.mode!=='bot';
  this.active=false;
  let saved=false;
  for(let attempt=0;attempt<2&&!saved;attempt++){
    try{if(DF.Progression){await DF.Progression.claim(this.matchId,won,rw,ranked);syncCloud();saved=true}}catch(e){console.warn('Match reward save failed:',e);if(attempt===0)await new Promise(r=>setTimeout(r,500))}
  }
  $('finalMy').textContent=this.score[me];$('finalBot').textContent=this.score[1-me];
  $('resultIcon').innerHTML=ico(won?'trophy':'sword');$('resultEyebrow').textContent=(ranked?'RANKED DUEL ':'PRACTICE DUEL ')+(won?'WON':'LOST');$('resultTitle').textContent=won?'VICTORY':'DEFEAT';
  $('resultTitle').className=won?'win':'lose';$('rewardWins').textContent=ranked?'+1':'—';$('rewardWinsLbl').textContent=ranked?(won?'RANKED WIN':'RANKED LOSS'):'UNRANKED';
  $('rewardNote').textContent=`${base} base + ${rw} rounds × 10`+(ranked?'':' · practice duels never count toward the leaderboard')+(saved?'':' · reward could not be saved');
  const el=$('rewardCoins');let t0=performance.now();(function tick(n){const k=clamp((n-t0)/900,0,1);el.textContent='+'+Math.round(coins*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(tick)})(t0);
  $('rematchBtn').disabled=false;$('rematchBtn').textContent=this.mode==='bot'?'REMATCH':'REMATCH (BOTH PLAYERS)';this._finishing=false;show('result')},
 pause(on){if(this.mode==='bot')this.paused=on;$('pauseMenu').hidden=!on;if(!on)last=performance.now()},
 quit(){this.paused=false;this.active=false;$('pauseMenu').hidden=true;if(this.mode!=='bot'){Net.send({t:'quit'});Net.close()}show('home')}
};

/* ================= wiring ================= */
const pick=a=>a[(Math.random()*a.length)|0];
const botNames=['ASHEN WARDEN','GRAVE KNIGHT','EMBER CHAMPION','BLACK MARSHAL','PLAGUE LORD','HOLLOW SENTINEL'];
function startBot(){Match.start({mode:'bot',names:[state.player.name,pick(botNames)],characters:[state.player.characterId,DF.Characters?.random?.(state.player.characterId)||'frost'],seed:(Math.random()*1e9)|0})}
$('botBtn').onclick=startBot;
$('charactersBtn').onclick=openCharacters;
$('charBack').onclick=()=>show('home');
$('mpBtn').onclick=()=>{mpMsg('');busy(false);show('mp')};
$('leaderBtn').onclick=()=>show('leaderboard');
$('settingsBtn').onclick=()=>show('settings');
document.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>show('home'));
$('resultHome').onclick=()=>{if(Match.mode!=='bot'){Net.send({t:'quit'});Net.close()}show('home')};
$('rematchBtn').onclick=()=>{if(Match.mode==='bot'){startBot();return}
 const f=Match.rematchFlags;f.me=true;Net.send({t:'rematch'});$('rematchBtn').textContent='WAITING FOR OPPONENT…';tryRematch()};
function tryRematch(){const f=Match.rematchFlags;if(Match.mode==='host'&&f&&f.me&&f.opp){Match.rematchFlags={me:false,opp:false};const seed=(Math.random()*1e9)|0,matchId=((crypto&&crypto.randomUUID)?crypto.randomUUID():'m_'+Date.now());Net.send({t:'start',names:Match.names,characters:[state.player.characterId,Match.p2.characterId],seed,matchId});Match.start({mode:'host',names:Match.names,characters:[state.player.characterId,Match.p2.characterId],seed,matchId})}}
$('pauseBtn').onclick=()=>{SFX.ui();Match.pause(true)};
$('resumeBtn').onclick=()=>Match.pause(false);
$('quitDuel').onclick=()=>Match.quit();
$('fsBtn').onclick=()=>{const d=document.documentElement;try{(d.requestFullscreen?d.requestFullscreen():Promise.reject()).then(()=>{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})}).catch(()=>{})}catch(e){}};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&Match.active&&Match.mode==='bot'&&!Match.paused)Match.pause(true)});

/* ---- sound / graphics settings ---- */
function setSound(on){state.muted=!on;SFX.muted=state.muted;if(on){SFX.init();SFX.resume();SFX.ui()}save();if(DF.Progression)DF.Progression.setSettings({sound:!state.muted,gfx:state.gfx}).catch(()=>{});updateHome();updateSettings()}
$('muteBtn').onclick=()=>setSound(state.muted);$('setSound').onclick=()=>setSound(state.muted);
function updateSettings(){$('setSound').setAttribute('aria-checked',String(!state.muted));document.querySelectorAll('#setGfx button').forEach(b=>b.classList.toggle('on',b.dataset.g===state.gfx));$('setName').textContent=state.player.name}
$('setGfx').onclick=e=>{const g=e.target.dataset&&e.target.dataset.g;if(!g)return;state.gfx=g;autoLow=false;qual=baseQual();applyGfx();save();if(DF.Progression)DF.Progression.setSettings({sound:!state.muted,gfx:state.gfx}).catch(()=>{});updateSettings()};
$('setRename').onclick=()=>openName(true);

/* ---- gamertag ---- */
const TAG1=['ASH','GRIM','IRON','EMBER','DUSK','RAVEN','BLACK','THORN','CRYPT','BLOOD'],TAG2=['KNIGHT','WARDEN','BLADE','REAVER','MARSHAL','SLAYER','WOLF','LORD'];
const cleanName=s=>String(s||'').replace(/[^\w\- ]/g,'').replace(/\s+/g,' ').trim().slice(0,14).toUpperCase();
function openName(canCancel){$('nameIn').value=state.player.name;$('nameErr').textContent='';$('nameCancel').hidden=!canCancel;show('nameScreen');setTimeout(()=>{try{$('nameIn').focus()}catch(e){}},60)}
async function submitName(){const n=cleanName($('nameIn').value);if(n.length<2){$('nameErr').textContent='Use at least 2 letters or numbers.';return}state.player.name=n;save();try{if(DF.Progression)await DF.Progression.setName(n)}catch(e){$('nameErr').textContent=e.message||'Could not save name.';return}openCharacters()}
$('nameOk').onclick=submitName;$('nameCancel').onclick=()=>show('home');$('namePill').onclick=()=>openName(true);
$('nameIn').onkeydown=e=>{if(e.key==='Enter')submitName()};$('nameIn').oninput=()=>{$('nameErr').textContent=''};
$('diceBtn').onclick=()=>{$('nameIn').value=(pick(TAG1)+pick(TAG2)+(10+((Math.random()*90)|0))).slice(0,14);$('nameErr').textContent=''};

/* ---- splash -> authentication -> gamertag -> lobby ---- */

let splashDone=false;

async function continueAfterAuth(){

  try{

    const session =
      await DF.Supabase.auth.getSession();

    if(
      session &&
      session.data &&
      session.data.session
    ){

      if(DF.Progression)await DF.Progression.load();
      syncCloud();
      if(state.player.name)
        {if(!DF.Characters?.valid(state.player.characterId))openCharacters();else show('home');}
      else
        openName(false);

    }else{

      show('authScreen');

    }

  }catch(e){

    console.error('Authentication check failed:',e);

    show('authScreen');

  }

}


function leaveSplash(){

  if(splashDone)return;

  splashDone=true;

  clearTimeout(splashT);

  continueAfterAuth();

}


const splashT=setTimeout(
  leaveSplash,
  3900
);


$('splash').addEventListener(
  'pointerdown',
  ()=>{
    SFX.init();
    SFX.resume();
    leaveSplash();
  }
);


/* Called by auth.js after successful login/signup */

window.DuelForgeAuthReady=async function(){
  try{if(DF.Progression)await DF.Progression.load()}catch(e){}
  syncCloud();
  if(state.player.name){if(!DF.Characters?.valid(state.player.characterId))openCharacters();else show('home')}
  else openName(false);
};

/* ================= multiplayer: 4-digit room codes ================= */
let remoteName='OPPONENT',remoteCharacter='frost',roomT=0,roomBtns={};
function mpMsg(t,bad){const e=$('mpMsg');e.textContent=t;e.classList.toggle('bad',!!bad)}
function roomMsg(t,wait){const e=$('roomMsg');e.textContent=t;e.classList.toggle('wait',!!wait)}
function busy(on){$('mkRoom').disabled=on;$('joinBtn').disabled=on}
function setSlot(i,name,sub,filled){$('s'+i+'a').textContent=filled?(name[0]||'?'):'?';$('s'+i+'a').classList.toggle('empty',!filled);$('s'+i+'n').textContent=name;$('s'+i+'r').textContent=sub;$('s'+i+'a').parentNode.classList.toggle('on',!!filled)}
function showRoom(code,host){[...$('roomCode').children].forEach((el,k)=>el.textContent=code[k]||'-');
 if(host){setSlot(1,state.player.name,'HOST · YOU',true);setSlot(2,'Waiting…','GUEST',false);roomMsg('Waiting for opponent',true)}
 else{setSlot(1,'…','HOST',false);setSlot(2,state.player.name,'GUEST · YOU',true);roomMsg('Connected! Waiting for the host to start',true)}
 show('room')}
function wireNet(){
 Net.onjoining=()=>{if(cur==='room')roomMsg('Opponent is joining',true)};
 Net.onopen=()=>{busy(false);Net.send({t:'hello',name:state.player.name,character:state.player.characterId,mods:DF.Progression?DF.Progression.combat():{}});if(Net.role==='guest')showRoom(Net.code,false)};
 Net.onclose=()=>{
  if(Match.active&&Match.mode!=='bot'){banner('OPPONENT LEFT','','end');setTimeout(()=>{Match.active=false;Net.close();show('home')},1800)}
  else if(cur==='room')leftRoom();
  else if(cur==='result'&&Match.mode!=='bot'){$('rematchBtn').disabled=true;$('rematchBtn').textContent='OPPONENT LEFT'}};
 Net.onmessage=onNet;
 Net.onerror=m=>{busy(false);if(cur==='room'||cur==='mp'){clearTimeout(roomT);Net.close();mpMsg(m,true);show('mp')}}}
function leftRoom(){clearTimeout(roomT);Net.close();mpMsg('The other player left the room.',true);show('mp')}
$('codeIn').oninput=function(){this.value=this.value.replace(/\D/g,'').slice(0,4);mpMsg('')};
$('codeIn').onkeydown=e=>{if(e.key==='Enter')$('joinBtn').click()};
$('mkRoom').onclick=async()=>{if(!Net.supported())return mpMsg('Online play is not supported in this browser.',true);
 wireNet();busy(true);mpMsg('Creating room…');
 try{const code=await Net.host();busy(false);mpMsg('');showRoom(code,true)}catch(e){busy(false);mpMsg(e.message,true)}};
$('joinBtn').onclick=async()=>{const c=$('codeIn').value.replace(/\D/g,'');if(c.length!==4)return mpMsg('Enter the 4-digit room code.',true);
 if(!Net.supported())return mpMsg('Online play is not supported in this browser.',true);
 wireNet();busy(true);mpMsg('Connecting to room '+c+'…');
 try{await Net.join(c)}catch(e){busy(false);mpMsg(e.message,true)}};
$('leaveRoom').onclick=()=>{clearTimeout(roomT);if(Net.open)Net.send({t:'quit'});Net.close();mpMsg('');show('mp')};
const codeText=()=>'Join my DuelForge room! Code: '+Net.code;
const flashBtn=(id,label,icon,txt)=>{const b=$(id);b.innerHTML=ico(icon)+' '+txt;setTimeout(()=>{b.innerHTML=ico(icon)+' '+label},1200)};
$('copyCode').onclick=async()=>{try{await navigator.clipboard.writeText(Net.code)}catch(e){}flashBtn('copyCode','COPY','copy','COPIED')};
$('shareCode').onclick=async()=>{if(navigator.share){try{await navigator.share({title:'DuelForge',text:codeText()})}catch(e){}}else{try{await navigator.clipboard.writeText(codeText())}catch(e){}flashBtn('shareCode','SHARE','share','COPIED')}};

DF.hostRoomForFriend=async friendId=>{if(!DF.Net?.supported())throw Error('Online play is not supported in this browser.');wireNet();busy(true);const code=await Net.host();await DF.Progression.createDuelRequest?.(friendId,code);busy(false);showRoom(code,true);show('room');return code};
DF.joinRoomFromFriend=async code=>{if(!DF.Net?.supported())throw Error('Online play is not supported in this browser.');wireNet();busy(true);await Net.join(String(code));busy(false);showRoom(String(code),false);show('room')};
function onNet(m){
 switch(m.t){
  case'hello':remoteName=String(m.name||'OPPONENT').slice(0,14);remoteCharacter=DF.Characters?.valid(m.character)?m.character:'frost';if(m.mods)Match.p2.mods=m.mods;
   if(Net.role==='host'){setSlot(2,remoteName,'GUEST',true);roomMsg('Opponent joined! Starting…',false);clearTimeout(roomT);
    roomT=setTimeout(()=>{if(!Net.open||cur!=='room')return;const seed=(Math.random()*1e9)|0,names=[state.player.name,remoteName],characters=[state.player.characterId,remoteCharacter];const matchId=((crypto&&crypto.randomUUID)?crypto.randomUUID():'m_'+Date.now()+'_'+Math.random().toString(36).slice(2));Net.send({t:'start',names,characters,seed,matchId});Match.start({mode:'host',names,characters,seed,matchId})},1800)}
   else{setSlot(1,remoteName,'HOST',true);roomMsg('Joined! The match starts in a moment',true)}break;
  case'start':clearTimeout(roomT);Match.start({mode:'guest',names:m.names,characters:m.characters,seed:m.seed,matchId:m.matchId});break;
  case'in':if(Match.mode==='host')Match.remote={l:m.l,r:m.r,j:m.j,a:m.a,d:m.d,h:m.h|0,st:m.st|0};break;
  case'pstart':if(Match.mode==='guest'&&Match.active){Match.round=m.n;Match.score=m.sc;Match.picks=[null,null];Match.enterPick()}break;
  case'pick':if(Match.mode==='host'&&m.n===Match.round)Match.setRemotePick(m.w);break;
  case'lock':if(Match.mode==='guest'&&Match.phase==='pick')Picker.setOpp(true);break;
  case'round':if(Match.mode==='guest'){Match.round=m.n;Match.score=m.sc;Match.applyRound(m.w[0],m.w[1])}break;
  case'ph':if(Match.mode!=='guest')break;if(m.ph==='fight')Match.startFight();else if(m.ph==='ko'){Match.score=m.sc;Match.round=m.r;Match.slow=m.ko?.9:0;Match.phase='fight';Match.showRoundEnd(m.w,!!m.ko)}break;
  case's':if(Match.mode==='guest'&&Match.active){Match.p1.applySnap(m.a,Match);Match.p2.applySnap(m.b,Match);Match.timeLeft=m.tm}break;
  case'hit':if(Match.mode==='guest'&&Match.active)Match.fxHit(m.s,m.x,m.y,m.g||(m.s?Match.p2:Match.p1).weapon.dmg,!!m.k,m.d,!!m.v);break;
   case'power':if(Match.mode==='guest'&&Match.active){const pf=m.s===0?Match.p1:Match.p2;FX.ring(m.x,m.y,pf.pal.accent,m.type==='lightning'?110:70,.35);FX.sparks(m.x,m.y,pf.facing,12,pf.pal.accent,420);SFX.dash();}break;
  case'powerHit':if(Match.mode==='guest'&&Match.active){const df=m.s===0?Match.p2:Match.p1;df.hp=Math.max(0,df.hp-(m.d|0));if(m.k)df.die(m.dir||1,80);else df.hurt(m.dir||1,80,60,.24);Match.fxHit(m.s,m.x,m.y,m.d|0,!!m.k,m.dir||1,true);}break;
  case'rematch':if(Match.rematchFlags){Match.rematchFlags.opp=true;tryRematch()}break;
  case'quit':if(Match.active&&Match.mode!=='bot'){banner('OPPONENT LEFT','','end');setTimeout(()=>{Match.active=false;Net.close();show('home')},1800)}
   else if(cur==='room')leftRoom();else if(cur==='result'){$('rematchBtn').disabled=true;$('rematchBtn').textContent='OPPONENT LEFT'}break;
 }}

syncCloud();applyGfx();updateHome();
DF.Match=Match;DF.step=dt=>{Match.update(dt);render()};DF.show=show;
})();
