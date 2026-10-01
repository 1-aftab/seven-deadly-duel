(() => {
'use strict';
const $=id=>document.getElementById(id), screens=['home','peer','duel','result'];
const WEAPONS=[
 {name:'IRON SWORD',icon:'⚔',reach:78,speed:620,dmg:18,knock:360,arc:1.35,wind:.16,active:.16,recover:.28,trail:4,color:'#9ee9ff'},
 {name:'DAGGER',icon:'†',reach:48,speed:820,dmg:12,knock:210,arc:1.05,wind:.10,active:.12,recover:.18,trail:3,color:'#dce7ff'},
 {name:'WAR HAMMER',icon:'✦',reach:68,speed:430,dmg:29,knock:560,arc:1.45,wind:.25,active:.18,recover:.42,trail:5,color:'#ffc66b'},
 {name:'SPEAR',icon:'⚔',reach:105,speed:560,dmg:17,knock:330,arc:.72,wind:.18,active:.15,recover:.30,trail:3,color:'#d5f7ff'},
 {name:'AXE',icon:'◈',reach:73,speed:500,dmg:24,knock:480,arc:1.55,wind:.21,active:.18,recover:.36,trail:5,color:'#ff8f74'},
 {name:'KATANA',icon:'刀',reach:88,speed:720,dmg:20,knock:300,arc:1.12,wind:.13,active:.14,recover:.24,trail:4,color:'#e6e8ff'},
 {name:'GREATBLADE',icon:'✣',reach:95,speed:380,dmg:34,knock:650,arc:1.65,wind:.30,active:.20,recover:.48,trail:6,color:'#c8a8ff'}
];
const SAVEKEY='duelforge_save_v2';
let saved=JSON.parse(localStorage.getItem(SAVEKEY)||'null')||{name:'AFTAB',wins:0,coins:500};
const state={player:{...saved},mode:'bot',round:1,myRounds:0,botRounds:0,weapon:null,enemyWeapon:null,started:false,over:false,roundTimer:0,countdown:0,hitStop:0,shake:0,particles:[],trails:[],botThink:0,matchWinner:null};
const keys={left:false,right:false,jump:false,dash:false,attack:false};
const canvas=$('game'),ctx=canvas.getContext('2d');
let W=1280,H=560,DPR=1,last=0,acc=0;
const world={floor:.78,gravity:1850,left:.07,right:.93};
const player={x:.28,y:0,vx:0,vy:0,face:1,hp:100,ground:true,attack:null,attackCd:0,hurt:0,stun:0,dashCd:0,dashTime:0,anim:0,run:0,block:false,win:false,lose:false};
const enemy={x:.72,y:0,vx:0,vy:0,face:-1,hp:100,ground:true,attack:null,attackCd:0,hurt:0,stun:0,dashCd:0,dashTime:0,anim:0,run:0,block:false,win:false,lose:false};
function show(id){screens.forEach(s=>$(s).classList.toggle('active',s===id)); if(id==='home')updateHome();}
function persist(){localStorage.setItem(SAVEKEY,JSON.stringify(state.player));}
function updateHome(){$('coins').textContent=state.player.coins.toLocaleString();$('wins').textContent=state.player.wins;$('homeCoins').textContent=state.player.coins.toLocaleString();$('homeWins').textContent=state.player.wins;}
function resetKeys(){Object.keys(keys).forEach(k=>keys[k]=false)}
function weaponForRound(n){return WEAPONS[(n-1)%WEAPONS.length]}
function startDuel(mode='bot',opponent='IRON WRAITH'){
 state.mode=mode;state.round=1;state.myRounds=0;state.botRounds=0;state.over=false;state.started=false;state.playerName=state.player.name;state.opponent=opponent;
 $('heroName').textContent=state.player.name;$('enemyName').textContent=opponent;show('duel');beginRound();
}
function beginRound(){
 resetKeys(); state.weapon=weaponForRound(state.round); state.enemyWeapon=WEAPONS[(state.round+2)%WEAPONS.length];
 player.x=.28;enemy.x=.72; player.y=enemy.y=0; player.vx=enemy.vx=0;player.vy=enemy.vy=0;player.hp=enemy.hp=100;player.attack=enemy.attack=null;player.attackCd=enemy.attackCd=0;player.hurt=enemy.hurt=0;player.stun=enemy.stun=0;player.dashCd=enemy.dashCd=0;player.win=enemy.win=false;player.lose=enemy.lose=false;
 state.countdown=3.0;state.started=false;state.roundTimer=0;state.particles=[];state.trails=[];state.hitStop=0;state.shake=0;state.botThink=.5;
 $('roundNo').textContent=state.round;$('myRounds').textContent=state.myRounds;$('botRounds').textContent=state.botRounds;$('weaponInfo').textContent=state.weapon.name;$('topWeapon').textContent=state.weapon.name;$('weaponIcon').textContent=state.weapon.icon;updateHp();showRoundCall('ROUND '+state.round,1.0);
}
function showRoundCall(text,dur){const el=$('roundCall');el.textContent=text;el.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.7)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.25},{opacity:0,transform:'translate(-50%,-50%) scale(1.08)'}],{duration:dur*1000,easing:'ease-out'});}
function banner(text,color='#fff'){const el=$('banner');el.textContent=text;el.style.color=color;el.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.65)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.2},{opacity:0,transform:'translate(-50%,-50%) scale(1.15)'}],{duration:700,easing:'cubic-bezier(.2,.8,.2,1)'});}
function toast(text){const el=$('toast');el.textContent=text;el.animate([{opacity:0,transform:'translate(-50%,-20%)'},{opacity:1,transform:'translate(-50%,0)',offset:.2},{opacity:0,transform:'translate(-50%,-10%)'}],{duration:1200})}
function updateHp(){$('heroHp').style.width=Math.max(0,player.hp)+'%';$('enemyHp').style.width=Math.max(0,enemy.hp)+'%';$('heroHpText').textContent=Math.ceil(Math.max(0,player.hp));$('enemyHpText').textContent=Math.ceil(Math.max(0,enemy.hp))}
function resize(){const r=canvas.getBoundingClientRect();DPR=Math.min(2,devicePixelRatio||1);W=Math.max(640,r.width);H=Math.max(300,r.width*(r.height/r.width));canvas.width=Math.floor(r.width*DPR);canvas.height=Math.floor(r.height*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);W=r.width;H=r.height}
window.addEventListener('resize',resize);resize();
function attack(f){if(!state.started||state.over||f.attack||f.attackCd>0||f.hurt>0||f.stun>0)return;const w=f===player?state.weapon:state.enemyWeapon;f.attack={t:0,phase:'wind',hit:false,w};f.attackCd=(w.wind+w.active+w.recover)*.45;f.vx*=.25}
function dash(f){if(!state.started||f.dashCd>0||f.hurt>0||f.stun>0)return;f.dashCd=1.0;f.dashTime=.16;f.vx=f.face*720;for(let i=0;i<6;i++)spawnParticle(f.x,f.y+.7,'dust')}
function jump(f){if(!state.started||!f.ground||f.hurt>0||f.stun>0)return;f.vy=-760;f.ground=false;for(let i=0;i<7;i++)spawnParticle(f.x,f.y,'dust')}
function updateFighter(f,dt,move){f.anim+=dt;f.attackCd=Math.max(0,f.attackCd-dt);f.dashCd=Math.max(0,f.dashCd-dt);f.hurt=Math.max(0,f.hurt-dt);f.stun=Math.max(0,f.stun-dt);f.dashTime=Math.max(0,f.dashTime-dt);
 if(f.dashTime<=0){const accel=f.ground?2500:900;f.vx+=(move*accel*dt);const max=f.ground?300:260;if(Math.abs(f.vx)>max)f.vx=Math.sign(f.vx)*max;f.vx*=Math.pow(.0008,dt)}
 if(f.ground&&move!==0)f.face=move>0?1:-1;
 f.vy+=world.gravity*dt;f.y+=f.vy*dt;if(f.y>=0){f.y=0;f.vy=0;f.ground=true}else f.ground=false;
 f.x+=f.vx*dt;f.x=Math.max(world.left,Math.min(world.right,f.x));
 if(f.attack)updateAttack(f,dt);
}
function updateAttack(f,dt){const a=f.attack,w=a.w;a.t+=dt;const total=w.wind+w.active+w.recover;if(a.t<w.wind)a.phase='wind';else if(a.t<w.wind+w.active)a.phase='active';else a.phase='recover';if(a.t>=w.wind+w.active&&!a.hit)a.hit=true;if(a.phase==='active'&&!a.didHit){a.didHit=true;checkHit(f)}if(a.t>=total)f.attack=null}
function checkHit(att){const def=att===player?enemy:player;if(def.hurt>0||def.lose)return;const w=att.attack.w;const dx=(def.x-att.x)*W;const dir=att.face;if(dx*dir< -18 || Math.abs(dx)>w.reach+34 || Math.abs(def.y-att.y)>1.1)return;
 let dmg=w.dmg;if(def.block)dmg*=.35;def.hp-=dmg;def.hurt=.20;def.stun=w===WEAPONS[2]?0.28:.18;def.vx=att.face*w.knock;state.hitStop=w===WEAPONS[2]||w===WEAPONS[6] ? .075:.045;state.shake=8;spawnImpact(def.x,def.y+.72,w.color);banner(w.name==='WAR HAMMER'?'CRUSH':'HIT',w.color);updateHp();
 if(def.hp<=0)defeat(def===player?player:enemy)
}
function defeat(f){if(state.over)return;f.hp=0;f.lose=true;f.vx=(f===player?-1:1)*260;const winner=f===player?enemy:player;winner.win=true;state.started=false;state.roundTimer=1.0;for(let i=0;i<24;i++)spawnParticle(f.x,f.y+.7,'spark');setTimeout(()=>finishRound(winner===player?'player':'bot'),650)}
function finishRound(w){if(state.over)return;if(w==='player')state.myRounds++;else state.botRounds++;$('myRounds').textContent=state.myRounds;$('botRounds').textContent=state.botRounds;if(state.myRounds>=4||state.botRounds>=4){state.over=true;setTimeout(matchEnd,600);return}state.round++;setTimeout(beginRound,900)}
function matchEnd(){const won=state.myRounds>state.botRounds;state.matchWinner=won?'player':'bot';const coins=won?150:50;if(won)state.player.wins++;state.player.coins+=coins;persist();updateHome();$('finalMy').textContent=state.myRounds;$('finalBot').textContent=state.botRounds;$('resultIcon').textContent=won?'✦':'⚔';$('resultEyebrow').textContent=won?'DUEL WON':'DUEL LOST';$('resultTitle').textContent=won?'VICTORY':'DEFEAT';$('rewardWins').textContent=won?'+1':'0';$('rewardCoins').textContent='+'+coins;show('result')}
function botAI(dt){if(!state.started)return;const dx=player.x-enemy.x,dist=Math.abs(dx)*W;enemy.face=dx>0?1:-1;let move=0;if(enemy.stun>0||enemy.hurt>0)return;if(dist>enemy.attack?.w.reach||!enemy.attack){if(dist>130)move=Math.sign(dx);else if(dist<55)move=-Math.sign(dx);if(dist>180&&Math.random()<dt*.8)dash(enemy);}
 if(dist<enemy.enemyRange||dist<enemy.attack?.w.reach||dist<state.enemyWeapon.reach+45){if(!enemy.attack&&enemy.attackCd<=0&&Math.random()<dt*(dist<110?4.5:1.7))attack(enemy)}
 if(player.attack&&dist<150&&Math.random()<dt*3)enemy.block=true;else enemy.block=false;if(Math.random()<dt*.7&&enemy.ground&&dist<300)jump(enemy);updateFighter(enemy,dt,move)}
function inputPlayer(dt){if(!state.started)return;let move=(keys.right?1:0)-(keys.left?1:0);player.block=false;if(keys.attack){keys.attack=false;attack(player)}if(keys.jump){keys.jump=false;jump(player)}if(keys.dash){keys.dash=false;dash(player)}updateFighter(player,dt,move)}
function update(dt){if(state.hitStop>0){state.hitStop-=dt;return}if(!state.started){if(state.countdown>0){state.countdown-=dt;if(state.countdown<=0){state.started=true;showRoundCall('FIGHT',.7)}}else if(state.over===false&&state.roundTimer>0)state.roundTimer-=dt;return}inputPlayer(dt);botAI(dt);resolveSpacing();updateParticles(dt);updateTrails(dt)}
function resolveSpacing(){const d=(enemy.x-player.x)*W;const min=46;if(Math.abs(d)<min){const push=(min-Math.abs(d))/W/2;const s=d>=0?1:-1;player.x-=s*push;enemy.x+=s*push}}
function spawnParticle(x,y,type,color){state.particles.push({x,y,life:type==='spark'?.35:.55,vx:(Math.random()-.5)*(type==='spark'?900:260),vy:type==='spark'?-(300+Math.random()*500):-(60+Math.random()*160),type,color:color||'#b9c8e8',size:2+Math.random()*5})}
function spawnImpact(x,y,color){for(let i=0;i<18;i++)spawnParticle(x,y,'spark',color);for(let i=0;i<8;i++)spawnParticle(x,y,'dust','#d6d9e4')}
function updateParticles(dt){for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];p.life-=dt;p.x+=p.vx*dt/W;p.y+=p.vy*dt/H;p.vy+=900*dt;if(p.life<=0)state.particles.splice(i,1)}}
function updateTrails(dt){state.trails=state.trails.filter(t=>(t.life-=dt)>0)}
function draw(){ctx.clearRect(0,0,W,H);drawArena();drawWeaponFighter(enemy,true);drawWeaponFighter(player,false);drawParticles();if(state.shake>0)state.shake*=.86}
function drawArena(){const sx=(Math.random()-.5)*state.shake,sy=(Math.random()-.5)*state.shake;ctx.save();ctx.translate(sx,sy);let g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0a1020');g.addColorStop(.55,'#111a2e');g.addColorStop(1,'#080b13');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);const mx=W*.74,my=H*.22,r=Math.min(W,H)*.115;ctx.shadowBlur=45;ctx.shadowColor='#a9c8ff55';ctx.fillStyle='#dce5f2';ctx.beginPath();ctx.arc(mx,my,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;for(let i=0;i<55;i++){const x=((i*83)%W),y=((i*47)%H)*.55;ctx.fillStyle=i%7===0?'#aeefff':'#ffffff77';ctx.fillRect(x,y,1.5,1.5)}
 drawMountains(H*.56,'#0d1426',.015,70);drawMountains(H*.66,'#111b2d',.025,48);drawMountains(H*.73,'#172139',.04,30);const fy=H*world.floor;const grd=ctx.createLinearGradient(0,fy,0,H);grd.addColorStop(0,'#171b2a');grd.addColorStop(1,'#07090f');ctx.fillStyle=grd;ctx.fillRect(0,fy,W,H-fy);ctx.strokeStyle='#303955';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,fy);ctx.lineTo(W,fy);ctx.stroke();drawTorch(W*.08,fy);drawTorch(W*.92,fy);ctx.restore()}
function drawMountains(y,col,parallax,amp){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(0,y);for(let x=0;x<=W+80;x+=80){const yy=y-Math.sin(x*.008+parallax*10)*amp-(x%240)/10;ctx.lineTo(x,yy)}ctx.lineTo(W,H);ctx.fill()}
function drawTorch(x,y){ctx.strokeStyle='#33384b';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-55);ctx.stroke();const grd=ctx.createRadialGradient(x,y-64,3,x,y-64,48);grd.addColorStop(0,'#ffeaa0aa');grd.addColorStop(1,'#ff7a2400');ctx.fillStyle=grd;ctx.beginPath();ctx.arc(x,y-64,48,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffb84d';ctx.beginPath();ctx.arc(x,y-65,7+Math.sin(performance.now()/90)*2,0,Math.PI*2);ctx.fill()}
function drawWeaponFighter(f,isEnemy){const x=f.x*W,y=H*world.floor-f.y*H*.28;const scale=Math.min(W/1000,1.1);ctx.save();ctx.translate(x,y);ctx.scale(isEnemy?-scale:scale,scale);const bob=f.ground?Math.sin(f.anim*3)*2:0;const moving=Math.abs(f.vx)>40;const walk=moving?Math.sin(f.anim*12)*.65:0;const hurt=f.hurt>0;const win=f.win;const lose=f.lose;ctx.globalAlpha=lose?.78:1;
 ctx.fillStyle='#00000066';ctx.beginPath();ctx.ellipse(0,5,54,12,0,0,Math.PI*2);ctx.fill();ctx.translate(0,bob);
 ctx.strokeStyle=isEnemy?'#ff5f98':'#64ddff';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-18,-80);ctx.lineTo(-32,-5+walk*9);ctx.moveTo(18,-80);ctx.lineTo(32,-5-walk*9);ctx.stroke();
 ctx.fillStyle=isEnemy?'#24162d':'#171b3a';ctx.beginPath();ctx.moveTo(-37,-188);ctx.quadraticCurveTo(0,-220,37,-188);ctx.lineTo(30,-80);ctx.lineTo(-30,-80);ctx.closePath();ctx.fill();ctx.strokeStyle=isEnemy?'#a83269':'#3f4da0';ctx.stroke();
 ctx.fillStyle='#aab8cb';ctx.beginPath();ctx.arc(0,-220,25,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111725';ctx.beginPath();ctx.arc(0,-224,24,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle=isEnemy?'#ff4d9b':'#62e9ff';ctx.fillRect(8,-221,10,3);
 ctx.strokeStyle=isEnemy?'#4a294d':'#2a335d';ctx.lineWidth=16;ctx.beginPath();ctx.moveTo(-27,-168);ctx.lineTo(-53,-108+walk*8);ctx.moveTo(27,-168);ctx.lineTo(54,-108-walk*8);ctx.stroke();
 drawAttackWeapon(f,isEnemy);ctx.restore()}
function drawAttackWeapon(f,isEnemy){const w=f===player?state.weapon:state.enemyWeapon;let phase=f.attack?.phase||'idle',t=f.attack?.t||0;let angle=-.55*f.face;let length=w.reach;let wind=w.wind,active=w.active;let p=phase==='idle'?0:phase==='wind'?t/wind:phase==='active'?1-(t-wind)/active:0;let rot;if(phase==='idle')rot=-.55;else if(phase==='wind')rot=-.55-w.arc*p*.8;else if(phase==='active')rot=-.55-w.arc*.8+w.arc*1.6*(1-p);else rot=.85-w.arc*(1-(t-wind-active)/w.recover)*.15;rot*=f.face;
 ctx.save();ctx.translate(50,-137);ctx.rotate(rot);ctx.lineCap='round';ctx.strokeStyle=isEnemy?w.color:'#e7f4ff';ctx.lineWidth=w===WEAPONS[2]?18:w===WEAPONS[6]?14:8;ctx.shadowBlur=12;ctx.shadowColor=w.color;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(length,0);ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(4,-2);ctx.lineTo(length, -2);ctx.stroke();if(f.attack&&phase==='active'){ctx.strokeStyle=w.color+'66';ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,0,length,-.95,.95);ctx.stroke();state.trails.push({x:f.x,y:f.y+.7,rot,life:.10,w});}ctx.restore()}
function drawParticles(){for(const p of state.particles){ctx.globalAlpha=Math.max(0,p.life/.55);ctx.fillStyle=p.color;ctx.fillRect(p.x*W,p.y*H,p.size,p.size)}ctx.globalAlpha=1;for(const t of state.trails){ctx.save();ctx.globalAlpha=t.life/.10;ctx.translate(t.x*W,(world.floor-t.y)*H);ctx.strokeStyle=t.w.color;ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,-137, t.w.reach, t.rot-.5,t.rot+.5);ctx.stroke();ctx.restore()}}
function loop(ts){const dt=Math.min(.033,(ts-last)/1000||.016);last=ts;acc+=dt;if(acc>1)acc=0;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
function bindButton(el,key){const down=e=>{e.preventDefault();keys[key]=true};const up=e=>{e.preventDefault();keys[key]=false};['pointerdown','touchstart'].forEach(ev=>el.addEventListener(ev,down,{passive:false}));['pointerup','pointercancel','pointerleave','touchend'].forEach(ev=>el.addEventListener(ev,up,{passive:false}))}
document.querySelectorAll('[data-key]').forEach(b=>bindButton(b,b.dataset.key));
window.addEventListener('keydown',e=>{if($('duel').classList.contains('active')){if(['ArrowLeft','ArrowRight','ArrowUp',' ','Shift','a','d','w','j'].includes(e.key)||e.code==='Space')e.preventDefault();if(e.key==='a'||e.key==='ArrowLeft')keys.left=true;if(e.key==='d'||e.key==='ArrowRight')keys.right=true;if(e.key==='w'||e.key==='ArrowUp'||e.code==='Space')keys.jump=true;if(e.key==='Shift')keys.dash=true;if(e.key==='j'||e.code==='Space')keys.attack=true}});window.addEventListener('keyup',e=>{if(e.key==='a'||e.key==='ArrowLeft')keys.left=false;if(e.key==='d'||e.key==='ArrowRight')keys.right=false;if(e.key==='w'||e.key==='ArrowUp')keys.jump=false;if(e.key==='Shift')keys.dash=false});
$('botBtn').onclick=()=>startDuel('bot');$('peerBtn').onclick=()=>show('peer');$('brandHome').onclick=()=>{state.over=true;show('home')};$('quitDuel').onclick=()=>{state.over=true;resetKeys();show('home')};$('rematchBtn').onclick=()=>startDuel(state.mode,state.opponent);$('resultHome').onclick=()=>show('home');document.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>show('home'));
// Lightweight manual WebRTC signaling: static-host compatible, no fake online status.
let pc=null,dc=null,peerRole=null,peerInput={left:false,right:false,jump:false,dash:false,attack:false},lastNet=0;
function status(t){$('peerStatus').textContent=t}
function sendPeer(msg){if(dc&&dc.readyState==='open')dc.send(JSON.stringify(msg))}
function setupPeerChannel(){if(!dc)return;dc.onopen=()=>{status('Peer connected. Multiplayer transport is live.');sendPeer({type:'hello',name:state.player.name});startDuel('peer',state.opponent||'RIVAL')};dc.onmessage=e=>onPeer(JSON.parse(e.data));} 

function encode(obj){return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))}
function decode(s){return JSON.parse(decodeURIComponent(escape(atob(s.trim()))))}
async function makeOffer(){try{peerRole='host';pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});dc=pc.createDataChannel('duelforge');setupPeerChannel();const offer=await pc.createOffer();await pc.setLocalDescription(offer);await waitIce();$('offerBox').value=encode(pc.localDescription);status('Room code ready. Send it to your opponent.');}catch(e){status('WebRTC could not start: '+e.message)}}
async function makeAnswer(){try{peerRole='guest';pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});pc.ondatachannel=e=>{dc=e.channel;setupPeerChannel()};const offer=decode($('answerBox').value);await pc.setRemoteDescription(offer);const ans=await pc.createAnswer();await pc.setLocalDescription(ans);await waitIce();$('finalBox').value=encode(pc.localDescription);status('Answer ready. Send it back to the host.');}catch(e){status('Invalid room code or WebRTC error: '+e.message)}}
async function waitIce(){if(pc.iceGatheringState==='complete')return;await new Promise(res=>{const fn=()=>{if(pc.iceGatheringState==='complete'){pc.removeEventListener('icegatheringstatechange',fn);res()}};pc.addEventListener('icegatheringstatechange',fn);setTimeout(res,5000)})}
$('makeOffer').onclick=makeOffer;$('makeAnswer').onclick=makeAnswer;
$('acceptAnswer').onclick=async()=>{try{if(!pc){status('Create a room code first.');return}await pc.setRemoteDescription(decode($('hostAnswer').value));status('Connecting to opponent…');}catch(e){status('Invalid answer code: '+e.message)}};
$('copyOffer').onclick=()=>navigator.clipboard?.writeText($('offerBox').value);$('copyFinal').onclick=()=>navigator.clipboard?.writeText($('finalBox').value);
function onPeer(msg){
 if(msg.type==='hello'){state.opponent=msg.name||'RIVAL';$('enemyName').textContent=state.opponent;sendPeer({type:'helloAck',name:state.player.name});}
 if(msg.type==='helloAck'){state.opponent=msg.name||'RIVAL';$('enemyName').textContent=state.opponent;}
 if(msg.type==='input'&&peerRole==='host'){peerInput=msg.input||peerInput;}
 if(msg.type==='snapshot'&&peerRole==='guest'&&msg.s){enemy.x=msg.s.x;enemy.y=msg.s.y;enemy.vx=msg.s.vx;enemy.vy=msg.s.vy;enemy.hp=msg.s.hp;enemy.attack=msg.s.attack;e
