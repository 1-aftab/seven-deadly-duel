/* DuelForge — app shell, match controller, input, render loop, UI, online glue */
(function(){
'use strict';
const DF=window.DF,{FX,SFX,Arena,Net,WEAPONS,WEAPON_ORDER}=DF;
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

/* ================= profile / leaderboard (kept from MVP, now persisted) ================= */
const KEY='duelforge.v2';
const state={player:{name:'AFTAB',wins:0,coins:500},muted:false,
 board:[{name:'ShadowKnight',wins:42,coins:18450},{name:'DarkBlade',wins:39,coins:19870},{name:'PixelWarrior',wins:35,coins:16420},
  {name:'KnightX',wins:31,coins:14900},{name:'VoidWalker',wins:27,coins:13100},{name:'IronWraith',wins:24,coins:11020}]};
try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){Object.assign(state.player,s.player||{});state.muted=!!s.muted}}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({player:state.player,muted:state.muted}))}catch(e){}};
SFX.muted=state.muted;

const screens=['home','challenge','leaderboard','duel','result'];
function show(id){screens.forEach(s=>$(s).classList.toggle('active',s===id));document.body.classList.toggle('in-duel',id==='duel');
 if(id==='home')updateHome();if(id==='leaderboard')renderBoard();if(id!=='duel'){Match.active=false}window.scrollTo(0,0)}
function ranked(){return[...state.board,state.player].sort((a,b)=>b.wins-a.wins||b.coins-a.coins)}
function updateHome(){$('homeWins').textContent=state.player.wins;$('homeCoins').textContent=state.player.coins;$('homeRank').textContent='#'+(ranked().indexOf(state.player)+1);
 $('playerName').textContent=state.player.name;$('muteBtn').textContent=state.muted?'🔇':'🔊'}
function renderBoard(){const all=ranked();
 $('board').innerHTML='<div class="row header"><span>#</span><span>FIGHTER</span><span>WINS</span><span>COINS</span></div>'+
 all.map((x,i)=>`<div class="row ${x===state.player?'me':''}"><span class="rank">${i<3?['🥇','🥈','🥉'][i]:i+1}</span><b>${escapeHtml(x.name)}</b><b>${x.wins}</b><b class="coins">${x.coins.toLocaleString()}</b></div>`).join('')}

/* ================= input ================= */
const Input={left:false,right:false,j:0,a:0,d:0,
 dir(l,r){this.left=l;this.right=r;$('leftBtn').classList.toggle('on',l);$('rightBtn').classList.toggle('on',r)},
 press(k){this[k]++;SFX.init();SFX.resume()},clear(){this.dir(false,false)}};
const KEYMAP={a:'L',arrowleft:'L',d:'R',arrowright:'R',w:'J',arrowup:'J',' ':'J',j:'A',k:'A',l:'D',shift:'D'};
const held={L:false,R:false};
addEventListener('keydown',e=>{if(!Match.active)return;const k=KEYMAP[e.key.toLowerCase()];if(!k)return;e.preventDefault();
 if(k==='L'||k==='R'){held[k]=true;Input.dir(held.L,held.R)}else if(!e.repeat)Input.press({J:'j',A:'a',D:'d'}[k])});
addEventListener('keyup',e=>{const k=KEYMAP[e.key.toLowerCase()];if(k==='L'||k==='R'){held[k]=false;Input.dir(held.L,held.R)}});
addEventListener('blur',()=>{held.L=held.R=false;Input.clear()});
(function touch(){
 const dpad=$('dpad');let ptr=null;
 const upd=e=>{const r=dpad.getBoundingClientRect(),x=e.clientX-r.left;const l=x<r.width*.5;Input.dir(l,!l)};
 dpad.addEventListener('pointerdown',e=>{e.preventDefault();ptr=e.pointerId;try{dpad.setPointerCapture(ptr)}catch(x){}upd(e);SFX.init();SFX.resume()});
 dpad.addEventListener('pointermove',e=>{if(e.pointerId===ptr)upd(e)});
 const up=e=>{if(e.pointerId===ptr){ptr=null;Input.dir(held.L,held.R)}};dpad.addEventListener('pointerup',up);dpad.addEventListener('pointercancel',up);
 [['attackBtn','a'],['jumpBtn','j'],['dashBtn','d']].forEach(([id,k])=>{const b=$(id);
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('down');Input.press(k)});
  const off=()=>b.classList.remove('down');b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off)});
 const duel=$('duel');duel.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});duel.addEventListener('touchstart',e=>{if(!e.target.closest('#pauseMenu'))e.preventDefault()},{passive:false});
 duel.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('gesturestart',e=>e.preventDefault());
 const coarse=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0||'ontouchstart' in window;document.body.classList.toggle('touch',coarse);
})();

/* ================= view / render ================= */
const canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
let view=null,cam={z:1},qual=0,ema=.0167,seen=0;
function resize(){const cw=innerWidth,ch=innerHeight;if(!cw||!ch)return;let r=Math.min(devicePixelRatio||1,2)*Math.pow(.75,qual);if(cw*r>1280)r=1280/cw;
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
 ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(Arena.vig,0,0);
}
let last=0,raf=0;
function frame(now){raf=requestAnimationFrame(frame);let dt=(now-last)/1000;last=now;if(!(dt>0))return;if(dt>.05)dt=.05;if(!Match.active)return;Match.update(dt);render();
 if(!Match.paused){ema=ema*.95+dt*.05;if(++seen>120&&ema>.027&&qual<2){qual++;seen=0;ema=.0167;resize()}}}

/* ================= HUD helpers ================= */
const hudCache={};
function setBar(side,hp){const k=side+'hp';if(hudCache[k]===hp)return;hudCache[k]=hp;const v=clamp(hp/100,0,1);
 $(side+'Hp').style.transform=`scaleX(${v})`;$(side+'Ghost').style.transform=`scaleX(${v})`;$(side+'HpText').textContent=Math.max(0,Math.ceil(hp));
 $(side+'Hp').parentNode.classList.toggle('low',hp<=30)}
function setPips(side,n){const el=$(side+'Pips');if(!el.children.length)for(let i=0;i<4;i++)el.appendChild(document.createElement('i'));
 [...el.children].forEach((p,i)=>p.classList.toggle('on',i<n))}
function banner(main,sub,cls){const b=$('banner');$('bannerMain').textContent=main;$('bannerSub').textContent=sub||'';b.className='';void b.offsetWidth;b.className='show '+(cls||'')}
function weaponCard(who,w,cls){const s=w.stats,bar=(l,v)=>`<div class="st"><label>${l}</label><span><i style="--v:${v.toFixed(2)}"></i></span></div>`;
 return`<div class="wcard ${cls}"><small>${escapeHtml(who)}</small><b>${w.name}</b>${bar('DMG',s.dmg)}${bar('SPD',s.spd)}${bar('RNG',s.rng)}</div>`}
function flashScreen(){const f=$('hitFlash');f.classList.remove('go');void f.offsetWidth;f.classList.add('go')}

/* ================= match ================= */
const Match={
 active:false,mode:'bot',me:0,phase:'none',phaseT:0,round:1,score:[0,0],rand:null,prevW:[null,null],names:['AFTAB','IRON WRAITH'],
 p1:new DF.Fighter(0,'P1'),p2:new DF.Fighter(1,'P2'),bot:null,timeLeft:60,hitstop:0,slow:0,paused:false,netT:0,inT:0,lastIn:'',remote:{l:0,r:0,j:0,a:0,d:0},seen:[[0,0,0],[0,0,0]],ended:false,koShown:false,
 start(o){this.mode=o.mode;this.me=o.mode==='guest'?1:0;this.names=o.names;this.p1.name=o.names[0];this.p2.name=o.names[1];
  let s=(o.seed>>>0)||1;this.rand=()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  this.score=[0,0];this.round=1;this.prevW=[null,null];this.bot=o.mode==='bot'?new DF.Bot(1):null;this.paused=false;this.ended=false;this.remote={l:0,r:0,j:0,a:0,d:0};this.seen=[[0,0,0],[0,0,0]];
  this.hitstop=0;this.slow=0;cam.z=1;FX.reset();$('pauseMenu').hidden=true;
  $('heroName').textContent=this.names[0];$('enemyName').textContent=this.names[1]+(o.mode==='guest'?' (YOU)':'');
  for(const k in hudCache)delete hudCache[k];setPips('hero',0);setPips('enemy',0);$('myRounds').textContent=$('botRounds').textContent='0';
  show('duel');this.active=true;Input.clear();resize();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
  SFX.init();SFX.resume();if(o.mode!=='guest')this.beginRound()},
 pickWeapons(){const pick=(not1,not2)=>{let w;do{w=WEAPON_ORDER[(this.rand()*WEAPON_ORDER.length)|0]}while(w===not1||w===not2);return w};
  const a=pick(this.prevW[0],null),b=pick(this.prevW[1],a);this.prevW=[a,b];return[a,b]},
 beginRound(){const[a,b]=this.pickWeapons();this.applyRound(a,b);if(this.mode==='host')Net.send({t:'round',n:this.round,w:[a,b],sc:this.score})},
 applyRound(a,b){const w1=WEAPONS[a],w2=WEAPONS[b];this.p1.reset(300,1,w1);this.p2.reset(660,-1,w2);this.phase='intro';this.phaseT=0;this.timeLeft=60;this.koShown=false;this.slow=0;
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
 onSwing(f){SFX.swing(f.weapon.dmg>=20)},
 onSwingEnd(f){if(f.weapon.id==='hammer'||f.weapon.id==='greatblade'){const s=f.seg({});if(s.ty>380){FX.dust(s.tx,412,7);FX.ring(s.tx,410,'#cfd6ff',46,.3);FX.shake(f.weapon.id==='hammer'?3.5:2.5)}}},
 hud(){setPips('hero',this.score[0]);setPips('enemy',this.score[1]);$('myRounds').textContent=this.score[0];$('botRounds').textContent=this.score[1]},
 /* ---- hit resolution ---- */
 _s:{},_pv:{},
 hitCheck(att,def){
  if(att.mode!=='attack'||!att.atk||att.atk.phase!==1||att.atk.hit||def.inv>0||def.mode==='ko'||this.phase!=='fight')return null;
  if(att.atk.t<att.weapon.swing*.35)return null;
  const w=att.weapon,cur=att.seg(this._s),pv=att.prevSeg,th=w.thick;
  const x0=def.x-12-th*.5,x1=def.x+12+th*.5,y0=def.y-124-th*.4,y1=def.y-2;let hit=null;
  for(let s=0;s<=3&&!hit;s++){const k=s/3;
   const bx=pv?pv.bx+(cur.bx-pv.bx)*k:cur.bx,by=pv?pv.by+(cur.by-pv.by)*k:cur.by,tx=pv?pv.tx+(cur.tx-pv.tx)*k:cur.tx,ty=pv?pv.ty+(cur.ty-pv.ty)*k:cur.ty;
   for(let j=0;j<=6;j++){const u=j/6,px=bx+(tx-bx)*u,py=by+(ty-by)*u;if(px>x0&&px<x1&&py>y0&&py<y1){hit={x:px,y:py};break}}}
  if(!pv)att.prevSeg=this._pv;Object.assign(att.prevSeg,cur);return hit},
 applyHit(att,def,h){const w=att.weapon,dir=def.x>=att.x?1:-1;att.atk.hit=true;def.hp=Math.max(0,def.hp-w.dmg);
  const ko=def.hp<=0;if(ko)def.die(dir,w.kb);else def.hurt(dir,w.kb,def.grounded?w.up:w.up*.5,.22+w.kb/2200);
  this.fxHit(att.side,h.x,h.y,w.dmg,ko,dir);if(this.mode==='host')Net.send({t:'hit',s:att.side,x:Math.round(h.x),y:Math.round(h.y),k:ko?1:0,d:dir});return ko},
 fxHit(side,x,y,dmg,ko,dir){const att=side?this.p2:this.p1,def=side?this.p1:this.p2,w=att.weapon,col=att.pal.accent,heavy=w.dmg>=20;
  FX.sparks(x,y,dir,8+(dmg/3|0),col,420);FX.sparks(x,y,dir,5,'#ffffff',320);FX.flare(x,y,'#fff',24+dmg*.7);FX.ring(x,y,col,36+dmg);FX.shards(x,y,heavy?7:3,col);
  FX.float(def.x,def.y-135,'-'+dmg,'#fff');FX.shake(w.shake+(ko?4:0));this.hitstop=Math.max(this.hitstop,w.stop+(ko?.1:0));def.shakeT=w.stop+.1;def.flash=.1;cam.z+=heavy?.03:.012;
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
 feed(f,st){f.input.left=!!st.l;f.input.right=!!st.r;const i=f.side,s=this.seen[i];if(st.j!==s[0]){s[0]=st.j;f.input.jump=.14}if(st.a!==s[1]){s[1]=st.a;f.input.attack=.14}if(st.d!==s[2]){s[2]=st.d;f.input.dash=.14}},
 update(dt){
  if(this.paused){return}
  this.phaseT+=dt;
  let sd=dt;if(this.hitstop>0){this.hitstop-=dt;sd=0}else if(this.slow>0){this.slow-=dt;sd=dt*.3}
  const mine={l:Input.left,r:Input.right,j:Input.j,a:Input.a,d:Input.d};
  if(this.mode==='guest'){
   this.inT+=dt;const sig=''+mine.l+mine.r+mine.j+mine.a+mine.d;if(sig!==this.lastIn||this.inT>.1){this.lastIn=sig;this.inT=0;Net.send({t:'in',l:+mine.l,r:+mine.r,j:mine.j,a:mine.a,d:mine.d})}
   if(sd>0){for(const f of[this.p1,this.p2]){f.guestTick(sd);f.animate(sd);f.pushTrail(sd)}}
  }else{
   this.feed(this.p1,mine);if(this.mode==='host')this.feed(this.p2,this.remote);
   let left=sd;while(left>0){const h=Math.min(left,.02);this.simulate(h);left-=h}
   if(this.mode==='host'){this.netT+=dt;if(this.netT>=1/30){this.netT=0;Net.send({t:'s',a:this.p1.serialize(),b:this.p2.serialize(),tm:Math.ceil(this.timeLeft)})}}
  }
  FX.update(dt);Arena.update(dt);cam.z+=(1+(this.slow>0?.05:0)-cam.z)*(1-Math.exp(-dt*7));
  // phase machine (host/bot drive it; guest follows events but runs the same timers for pure presentation)
  if(this.phase==='intro'&&this.phaseT>=1.55&&this.mode!=='guest')this.startFight();
  else if(this.phase==='ko'){if(!this.koShown&&this.phaseT>=1.5){this.koShown=true;const w=this.lastWinner,me=this.me;
     if(this.ended)banner(w===me?'VICTORY':'DEFEAT','','end');else banner(w<0?'DRAW':w===me?'ROUND WON':'ROUND LOST',this.score[0]+' — '+this.score[1],'round')}
    if(this.phaseT>=3.2&&this.mode!=='guest')this.finishRound();else if(this.phaseT>=3.2&&this.mode==='guest'&&this.ended){this.phase='end';this.phaseT=0}}
  else if(this.phase==='end'&&this.phaseT>=2.2){this.phase='done';this.finish()}
  // HUD
  setBar('hero',this.p1.hp);setBar('enemy',this.p2.hp);const tl=Math.ceil(this.timeLeft);if(hudCache.t!==tl){hudCache.t=tl;$('timer').textContent=tl;$('timer').classList.toggle('low',tl<=10)}
 },
 finish(){if(this.mode==='host'||this.mode==='guest')this.rematchFlags={me:false,opp:false};
  const me=this.me,won=this.score[me]>=4,rw=this.score[me],base=won?150:50,coins=base+rw*10;
  state.player.coins+=coins;if(won)state.player.wins++;save();this.active=false;
  $('finalMy').textContent=this.score[0];$('finalBot').textContent=this.score[1];
  $('resultIcon').textContent=won?'🏆':'⚔️';$('resultEyebrow').textContent=won?'DUEL WON':'DUEL LOST';$('resultTitle').textContent=won?'VICTORY':'DEFEAT';
  $('resultTitle').className=won?'win':'lose';$('rewardWins').textContent=won?'+1':'0';$('rewardNote').textContent=`${base} base + ${rw} rounds × 10`;
  const el=$('rewardCoins');let t0=performance.now();(function tick(n){const k=clamp((n-t0)/900,0,1);el.textContent='+'+Math.round(coins*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(tick)})(t0);
  $('rematchBtn').textContent=this.mode==='bot'?'⚔ REMATCH':'⚔ REMATCH (BOTH PLAYERS)';show('result')},
 pause(on){if(this.mode==='bot')this.paused=on;$('pauseMenu').hidden=!on;if(!on)last=performance.now()},
 quit(){this.paused=false;this.active=false;$('pauseMenu').hidden=true;if(this.mode!=='bot'){Net.send({t:'quit'});Net.close()}show('home')}
};

/* ================= wiring ================= */
const botNames=['IRON WRAITH','GRAVE WARDEN','EMBER KNIGHT','VOID DUELIST'];
function startBot(){Match.start({mode:'bot',names:[state.player.name,botNames[(Math.random()*botNames.length)|0]],seed:(Math.random()*1e9)|0})}
$('botBtn').onclick=startBot;
$('challengeBtn').onclick=()=>{show('challenge');netStatus(Net.supported()?'':'WebRTC is not available in this browser.',!Net.supported())};
$('leaderBtn').onclick=()=>show('leaderboard');
document.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>show('home'));
$('resultHome').onclick=()=>{if(Match.mode!=='bot'){Net.send({t:'quit'});Net.close()}show('home')};
$('rematchBtn').onclick=()=>{if(Match.mode==='bot'){startBot();return}
 const f=Match.rematchFlags;f.me=true;Net.send({t:'rematch'});$('rematchBtn').textContent='WAITING FOR OPPONENT…';tryRematch()};
function tryRematch(){const f=Match.rematchFlags;if(Match.mode==='host'&&f&&f.me&&f.opp){Match.rematchFlags={me:false,opp:false};const seed=(Math.random()*1e9)|0;Net.send({t:'start',names:Match.names,seed});Match.start({mode:'host',names:Match.names,seed})}}
$('pauseBtn').onclick=()=>{SFX.ui();Match.pause(true)};
$('resumeBtn').onclick=()=>Match.pause(false);
$('quitDuel').onclick=()=>Match.quit();
$('fsBtn').onclick=()=>{const d=document.documentElement;try{(d.requestFullscreen?d.requestFullscreen():Promise.reject()).then(()=>{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})}).catch(()=>{})}catch(e){}};
$('muteBtn').onclick=()=>{state.muted=!state.muted;SFX.muted=state.muted;if(!state.muted){SFX.init();SFX.resume();SFX.ui()}save();updateHome()};
$('namePill').onclick=()=>{const n=prompt('Fighter name (max 14 chars)',state.player.name);if(n==null)return;const c=n.replace(/[^\w\- ]/g,'').trim().slice(0,14).toUpperCase();if(c){state.player.name=c;save();updateHome()}};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&Match.active&&Match.mode==='bot'&&!Match.paused)Match.pause(true)});

/* ================= online (WebRTC) ================= */
function netStatus(t,bad){const e=$('netStatus');e.textContent=t;e.classList.toggle('bad',!!bad)}
function tab(host){$('tabHost').classList.toggle('active',host);$('tabJoin').classList.toggle('active',!host);$('hostPane').hidden=!host;$('joinPane').hidden=host}
$('tabHost').onclick=()=>tab(true);$('tabJoin').onclick=()=>tab(false);
const copy=async id=>{const v=$(id).value;if(!v)return;try{await navigator.clipboard.writeText(v)}catch(e){$(id).select();document.execCommand('copy')}netStatus('Copied ✔')};
const share=async id=>{const v=$(id).value;if(!v)return;if(navigator.share){try{await navigator.share({title:'DuelForge code',text:v})}catch(e){}}else copy(id)};
const paste=async id=>{try{$(id).value=await navigator.clipboard.readText()}catch(e){netStatus('Paste manually into the box.',true)}};
$('copyHost').onclick=()=>copy('hostCode');$('shareHost').onclick=()=>share('hostCode');$('copyJoin').onclick=()=>copy('joinAnswer');$('shareJoin').onclick=()=>share('joinAnswer');
$('pasteHost').onclick=()=>paste('hostAnswer');$('pasteJoin').onclick=()=>paste('joinCode');
function wireNet(){Net.onopen=()=>{netStatus('Connected! Starting…');Net.send({t:'hello',name:state.player.name})};
 Net.onclose=()=>{if(Match.active&&Match.mode!=='bot'){banner('OPPONENT LEFT','','end');setTimeout(()=>{Match.active=false;show('home')},1800)}else if(!Match.active)netStatus('Disconnected.',true)};
 Net.onmessage=onNet}
$('mkRoom').onclick=async()=>{if(!Net.supported())return netStatus('WebRTC not supported here.',true);wireNet();netStatus('Gathering connection info…');$('hostCode').value='';
 try{$('hostCode').value=await Net.createRoom();netStatus('Send the code to your friend, then paste their reply below.')}catch(e){netStatus('Could not create room: '+e.message,true)}};
$('connectHost').onclick=async()=>{try{netStatus('Connecting…');await Net.acceptAnswer($('hostAnswer').value)}catch(e){netStatus('Invalid reply code: '+e.message,true)}};
$('mkAnswer').onclick=async()=>{if(!Net.supported())return netStatus('WebRTC not supported here.',true);wireNet();netStatus('Building reply…');$('joinAnswer').value='';
 try{$('joinAnswer').value=await Net.joinRoom($('joinCode').value);netStatus('Send this reply code back to the host. The duel starts automatically.')}catch(e){netStatus('Invalid room code: '+e.message,true)}};
let remoteName='OPPONENT';
function onNet(m){
 switch(m.t){
  case'hello':remoteName=String(m.name||'OPPONENT').slice(0,14);if(Net.role==='host'){const seed=(Math.random()*1e9)|0,names=[state.player.name,remoteName];Net.send({t:'start',names,seed});Match.start({mode:'host',names,seed})}break;
  case'start':Match.start({mode:'guest',names:m.names,seed:m.seed});break;
  case'in':if(Match.mode==='host')Match.remote={l:m.l,r:m.r,j:m.j,a:m.a,d:m.d};break;
  case'round':if(Match.mode==='guest'){Match.round=m.n;Match.score=m.sc;Match.applyRound(m.w[0],m.w[1])}break;
  case'ph':if(Match.mode!=='guest')break;if(m.ph==='fight')Match.startFight();else if(m.ph==='ko'){Match.score=m.sc;Match.round=m.r;Match.slow=m.ko?.9:0;Match.phase='fight';Match.showRoundEnd(m.w,!!m.ko)}break;
  case's':if(Match.mode==='guest'&&Match.active){Match.p1.applySnap(m.a,Match);Match.p2.applySnap(m.b,Match);Match.timeLeft=m.tm}break;
  case'hit':if(Match.mode==='guest'&&Match.active)Match.fxHit(m.s,m.x,m.y,(m.s?Match.p2:Match.p1).weapon.dmg,!!m.k,m.d);break;
  case'rematch':if(Match.rematchFlags){Match.rematchFlags.opp=true;tryRematch()}break;
  case'quit':if(Match.active){banner('OPPONENT LEFT','','end');setTimeout(()=>{Match.active=false;Net.close();show('home')},1800)}else{netStatus('Opponent left.',true)}break;
 }}

updateHome();tab(true);
DF.Match=Match;DF.step=dt=>{Match.update(dt);render()};
})();
