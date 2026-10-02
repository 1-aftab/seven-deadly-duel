/* DuelForge — procedural fighter: skeleton rig, pose blending, combat state, drawing */
(function(){
const DF=window.DF=window.DF||{};
const H=Math.PI/2;
const THIGH=30,SHIN=30,TORSO=42,UARM=23,FARM=22,HEADR=13;
const GROUND=412,WALK=215,JUMP=640,GRAV=1850,DASHV=640,HVCD=7,ATK_GAP=.28;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const MODES=['intro','free','attack','hurt','dash','win','lose','ko'];
const KEYS=['lean','head','f1','f2','b1','b2','w','fT','fK','bT','bK'];
const ARM=['f1','f2','b1','b2','w'],BODY=['lean','head'],LEGS=['fT','fK','bT','bK'];
const mk=()=>({lean:0,head:0,f1:0,f2:0,b1:0,b2:0,w:0,fT:H,fK:0,bT:H,bK:0});
const easeOut=t=>1-(1-t)*(1-t), easeOut3=t=>1-Math.pow(1-t,3), smooth=t=>t*t*(3-2*t);
const bounce=t=>{if(t<.6)return smooth(t/.6)*1.0;if(t<.8)return 1-.06*Math.sin((t-.6)/.2*3.14);return 1};

const PAL=[
 {armor:'#34426b',armor2:'#4d5f95',dark:'#1c2442',cloth:'#1b2a55',cape:'#17306a',trim:'#5de7ff',metal:'#9fb4d8',accent:'#5de7ff'},
 {armor:'#5a2a52',armor2:'#8a3f7d',dark:'#2a1230',cloth:'#4a1747',cape:'#5e1646',trim:'#ff4f9a',metal:'#d6a6c8',accent:'#ff4f9a'}
];
const PAL_FLASH={armor:'#ffffff',armor2:'#ffffff',dark:'#dfe9ff',cloth:'#eef3ff',cape:'#f4f8ff',trim:'#ffffff',metal:'#ffffff',accent:'#ffffff'};

function leg(t,k){const kx=Math.cos(t)*THIGH,ky=Math.sin(t)*THIGH,s=t+k;return{kx,ky,fx:kx+Math.cos(s)*SHIN,fy:ky+Math.sin(s)*SHIN}}
function ik(sx,sy,tx,ty,a,b,out){let dx=tx-sx,dy=ty-sy,d=Math.hypot(dx,dy);const ang=Math.atan2(dy,dx);d=Math.min(d,a+b-.01);d=Math.max(d,Math.abs(a-b)+.01);
 const A=Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1));out.ex=sx+Math.cos(ang+A)*a;out.ey=sy+Math.sin(ang+A)*a;out.hx=sx+Math.cos(ang)*d;out.hy=sy+Math.sin(ang)*d}

class Fighter{
 constructor(side,name){this.side=side;this.name=name;this.pal=PAL[side];this.pose=mk();this.tgt=mk();this.rig={};this.ik={};
  this.input={left:false,right:false,jump:0,attack:0,dash:0,heavy:0};this.atkCd=0;this.hvCd=0;this.trail=[];this.ghosts=[];this.cape={x:-26,y:46};this.weapon=DF.WEAPONS.sword;this.reset(300,1,this.weapon)}
 reset(x,face,weapon){this.x=x;this.y=GROUND;this.vx=0;this.vy=0;this.facing=face;this.grounded=true;this.hp=100;this.mode='intro';this.modeT=0;this.atk=null;this.prevSeg=null;
  this.dashCd=0;this.atkCd=0;this.hvCd=3.5;this.inv=0;this.flash=0;this.landT=0;this.walkPh=0;this.animT=Math.random()*5;this.rot=0;this.yOff=0;this.shakeT=0;this.hipY=-56;this.hurtDur=.3;this.dashDir=1;this.ghostT=0;
  this.trail.length=0;this.ghosts.length=0;this.weapon=weapon;this.input.left=this.input.right=false;this.input.jump=this.input.attack=this.input.dash=this.input.heavy=0;
  Object.assign(this.pose,DF.READY);this.rig={};this.computeRig(1)}
 setMode(m){this.mode=m;this.modeT=0}
 get alive(){return this.hp>0}
 /* ---------- gameplay logic (authoritative side only) ---------- */
 logic(dt,opp,G){
  const I=this.input,w=this.weapon;this.modeT+=dt;
  this.dashCd=Math.max(0,this.dashCd-dt);this.atkCd=Math.max(0,this.atkCd-dt);this.hvCd=Math.max(0,this.hvCd-dt);this.inv=Math.max(0,this.inv-dt);this.flash-=dt;this.landT-=dt;this.shakeT-=dt;
  I.jump=Math.max(0,I.jump-dt);I.attack=Math.max(0,I.attack-dt);I.dash=Math.max(0,I.dash-dt);I.heavy=Math.max(0,I.heavy-dt);
  const dir=(I.right?1:0)-(I.left?1:0),spd=WALK*w.speed;
  const faceOpp=()=>{const dx=opp.x-this.x;if(Math.abs(dx)>6)this.facing=dx>0?1:-1};
  const m=this.mode;
  if(m==='free'){
   faceOpp();
   const tv=dir*spd,k=this.grounded?16:5;this.vx+=(tv-this.vx)*Math.min(1,k*dt);
   if(I.jump>0&&this.grounded){this.vy=-JUMP;this.grounded=false;I.jump=0;G.onJump(this)}
   if(I.dash>0&&this.dashCd<=0)this.startDash(dir||this.facing,G);
   else if(I.heavy>0&&this.hvCd<=0)this.startAttack(G,true);
   else if(I.attack>0&&this.atkCd<=0)this.startAttack(G,false);
  }else if(m==='attack'){
   const a=this.atk;a.t+=dt;
   if(a.phase===0){this.vx+=(dir*spd*.3-this.vx)*Math.min(1,10*dt);if(a.t>=a.W){a.t-=a.W;a.phase=1;this.prevSeg=null;this.vx+=this.facing*w.lunge*(a.heavy?1.4:1);G.onSwing(this)}}
   if(a.phase===1){this.vx*=Math.exp(-dt*6);if(a.t>=a.S){a.t-=a.S;a.phase=2;G.onSwingEnd(this)}}
   if(a.phase===2){this.vx*=Math.exp(-dt*9);
    if(a.t>=a.R*.55){if(I.dash>0&&this.dashCd<=0){this.atk=null;this.startDash(dir||-this.facing,G)}
     else if(I.jump>0&&this.grounded){this.atk=null;this.setMode('free')}}
    if(this.atk&&a.t>=a.R){this.atk=null;this.setMode('free')}}
  }else if(m==='dash'){
   this.vx=this.dashDir*DASHV*Math.max(0,1-this.modeT/.2)+this.dashDir*80;this.ghostT-=dt;if(this.ghostT<=0){this.ghostT=.03;this.ghosts.push({x:this.x,y:this.y,f:this.facing,a:.5});if(this.ghosts.length>5)this.ghosts.shift()}
   if(this.modeT>=.19){this.setMode('free')}
  }else if(m==='hurt'){
   this.vx*=Math.exp(-dt*(this.grounded?5.5:1.5));if(this.modeT>=this.hurtDur&&this.grounded)this.setMode('free');else if(this.modeT>=this.hurtDur+.5)this.setMode('free');
  }else if(m==='ko'){this.vx*=Math.exp(-dt*(this.grounded?4:.8))}
  else{faceOpp();this.vx*=Math.exp(-dt*10)}
  // physics
  if(!this.grounded&&m!=='dash')this.vy+=GRAV*dt;
  this.x+=this.vx*dt;this.y+=this.vy*dt;
  if(this.y>=GROUND){if(!this.grounded){this.y=GROUND;if(this.vy>260){this.landT=.14;G.onLand(this)}this.vy=0;this.grounded=true}else{this.y=GROUND;this.vy=0}}
  if(this.x<56){this.x=56;this.vx=Math.max(0,this.vx)}else if(this.x>904){this.x=904;this.vx=Math.min(0,this.vx)}
 }
 atkTimes(hv){const w=this.weapon;return hv?{W:w.wind+.5,S:w.swing*1.15,R:w.rec*1.3,dmg:Math.min(36,Math.round(w.dmg*1.6+6))}:{W:w.wind,S:w.swing,R:w.rec,dmg:w.dmg}}
 atkCdMax(){const w=this.weapon;return w.wind+w.swing+w.rec+ATK_GAP}
 startAttack(G,hv){this.input.attack=0;this.input.heavy=0;const f={};for(const k of KEYS)f[k]=this.pose[k];const T=this.atkTimes(hv);
  this.atk={phase:0,t:0,hit:false,from:f,heavy:!!hv,W:T.W,S:T.S,R:T.R,dmg:T.dmg};
  if(hv){this.hvCd=HVCD;this.atkCd=Math.max(this.atkCd,T.W+T.S+T.R+.2)}else this.atkCd=T.W+T.S+T.R+ATK_GAP;
  this.setMode('attack');this.prevSeg=null;G.onAttackStart&&G.onAttackStart(this)}
 startDash(d,G){this.input.dash=0;this.atk=null;this.dashDir=d;this.dashCd=.85;this.inv=.12;this.setMode('dash');this.ghostT=0;G.onDash(this)}
 hurt(dir,kb,up,dur){this.atk=null;this.setMode('hurt');this.hurtDur=dur;this.vx=dir*kb;if(up>0){this.vy=-up;this.grounded=false}this.flash=.1;this.shakeT=.12;this.inv=dur+.1}
 die(dir,kb){this.atk=null;this.setMode('ko');this.vx=dir*kb*1.1;this.vy=-300;this.grounded=false;this.flash=.14;this.shakeT=.2;this.inv=9}
 /* ---------- animation ---------- */
 stance(T,t){const b=Math.sin(t*2.4);Object.assign(T,DF.READY);T.lean+=b*.018;T.f1+=b*.05;T.b1+=b*.04;T.w+=b*.05;T.head+=b*.015;T.fK+=b*.05;T.bK+=b*.05;this.breath=b}
 airPose(T,vy){const m=clamp((vy+320)/640,0,1);const L=(a,b)=>a+(b-a)*m;
  T.fT=H-L(.95,.4);T.fK=L(1.25,.4);T.bT=H+L(.4,.2);T.bK=L(.85,.3);T.lean=L(.12,.0);
  if(this.mode!=='attack'){T.f1=L(.3,-.2);T.f2=L(-.9,-1.0);T.w=L(-.8,-1.3);T.b1=L(-.5,-1.8);T.b2=L(.4,.4)}}
 animate(dt){
  this.animT+=dt;const P=this.pose,T=this.tgt,w=this.weapon,m=this.mode,t=this.animT;
  this.stance(T,t);let rArm=14,rBody=14,rLeg=16,direct=false;this.yOff=0;
  const fwd=this.vx*this.facing;
  const walk=()=>{const A=.62;this.walkPh+=this.vx*this.facing*dt*.055*(Math.abs(this.vx)<1?0:1);if(this.vx*this.facing<0)this.walkPh+=0;
   const ph=this.walkPh;T.fT=H-A*Math.sin(ph);T.fK=.15+.9*Math.max(0,Math.cos(ph));T.bT=H+A*Math.sin(ph);T.bK=.15+.9*Math.max(0,-Math.cos(ph));
   T.lean=.08+clamp(fwd/WALK,-1,1)*.07;T.b1=1.5+.45*Math.sin(ph);T.f1+=Math.sin(ph*2)*.04};
  if(m==='intro'){const k=clamp(this.modeT/.5,0,1);if(!this.grounded)this.airPose(T,this.vy);else{T.lean+=.2*(1-k);T.fK+=.5*(1-k);T.bK+=.5*(1-k)}}
  else if(m==='free'){if(!this.grounded)this.airPose(T,this.vy);else if(this.landT>0){T.fT=H-.7;T.fK=1.2;T.bT=H+.6;T.bK=1.0;T.lean=.3}
    else if(Math.abs(this.vx)>14)walk()}
  else if(m==='attack'){const a=this.atk;direct=true;rLeg=20;rBody=45;let u;const from=a.from,wp=w.wp,ep=w.ep;
   if(a.phase===0){u=easeOut(clamp(a.t/a.W,0,1));for(const k of KEYS)T[k]=from[k]+(wp[k]-from[k])*u;for(const k of LEGS)T[k]=wp[k];if(a.heavy)T.lean+=Math.sin(this.animT*60)*.025}
   else if(a.phase===1){const s=clamp(a.t/a.S,0,1);u=Math.pow(s,1.55);for(const k of KEYS)T[k]=wp[k]+(ep[k]-wp[k])*u;for(const k of LEGS)T[k]=ep[k]}
   else{const r=clamp(a.t/a.R,0,1);u=smooth(clamp((r-.18)/.82,0,1));const st=DF.READY;for(const k of KEYS)T[k]=ep[k]+(st[k]-ep[k])*u;for(const k of LEGS)T[k]=ep[k]+(st[k]-ep[k])*clamp(u*1.2,0,1)}
   if(!this.grounded){const A={};this.airPose(A,this.vy);for(const k of LEGS)T[k]=A[k]}}
  else if(m==='dash'){const d=this.dashDir*this.facing;T.lean=d>0?.55:-.3;T.fT=H-1.0*d;T.fK=.25;T.bT=H+1.0*d;T.bK=.2;T.f1=d>0?.1:.9;T.f2=d>0?-.1:-1.1;T.w=d>0?-.15:-1.0;T.b1=d>0?1.9:-.4;T.b2=-.3;rArm=30;rBody=30;rLeg=30}
  else if(m==='hurt'){const k=clamp(1-this.modeT/this.hurtDur,0,1),sh=Math.sin(this.modeT*60)*.03*k;
   T.lean=-.25-.4*k+sh;T.head=-.2-.45*k;T.f1=.1+.3*k;T.f2=.7;T.w=1.5+.3*k;T.b1=-2.5+.5*(1-k);T.b2=.3;T.fT=H-.5;T.fK=.4;T.bT=H+.5;T.bK=.6;rArm=rBody=rLeg=34;if(!this.grounded)this.airPose({},0)}
  else if(m==='win'){const t2=this.modeT;T.lean=-.06;T.f1=-1.55;T.f2=.0;T.w=-1.45+Math.sin(t2*5)*.22;T.b1=-.2;T.b2=-.5+Math.sin(t2*4)*.2;T.fT=H-.5;T.fK=.3;T.bT=H+.5;T.bK=.3;T.head=-.12;
   if(t2>.4)this.yOff=-Math.abs(Math.sin((t2-.4)*3.4))*(this.hp>0?12:0);rArm=rBody=rLeg=12}
  else if(m==='lose'){T.lean=.45;T.head=.65;T.f1=1.6;T.f2=.2;T.w=1.95;T.b1=1.3;T.b2=.1;T.fT=.06;T.fK=1.5;T.bT=1.95;T.bK=.95;rArm=rBody=rLeg=7}
  else if(m==='ko'){const k=clamp(this.modeT/.75,0,1);this.rot=-1.5*bounce(k)*(this.grounded||this.modeT>.2?1:.3);
   T.lean=-.15;T.head=-.3;T.f1=.9;T.f2=.5;T.w=2.1;T.b1=-1.2;T.b2=.5;T.fT=H-.25;T.fK=.25;T.bT=H+.3;T.bK=.35;rArm=rBody=rLeg=14}
  if(m!=='ko')this.rot=0;
  const ka=1-Math.exp(-rArm*dt),kb=1-Math.exp(-rBody*dt),kl=1-Math.exp(-rLeg*dt);
  for(const k of ARM)P[k]=direct?T[k]:P[k]+(T[k]-P[k])*ka;
  for(const k of BODY)P[k]+=(T[k]-P[k])*kb;for(const k of LEGS)P[k]+=(T[k]-P[k])*kl;
  // cape / plume secondary motion (local space, facing right)
  const cx=-24-clamp(fwd*.07,-12,22)+Math.sin(t*5)*1.6,cy=48-clamp(this.vy*.035,-26,22)+Math.sin(t*4.3)*1.4+(m==='ko'?-20:0),kc=1-Math.exp(-dt*8);
  this.cape.x+=(cx-this.cape.x)*kc;this.cape.y+=(cy-this.cape.y)*kc;
  for(const g of this.ghosts)g.a-=dt*2.4;while(this.ghosts.length&&this.ghosts[0].a<=0)this.ghosts.shift();
  this.computeRig(dt);
 }
 computeRig(dt){
  const P=this.pose,R=this.rig,w=this.weapon;
  const lf=leg(P.fT,P.fK),lb=leg(P.bT,P.bK);
  const hy=this.grounded?-Math.max(lf.fy,lb.fy):-(lf.fy+lb.fy)/2;
  this.hipY+=(hy-this.hipY)*(dt>=1?1:1-Math.exp(-dt*34));const hx=0,hyy=this.hipY;
  R.hx=hx;R.hy=hyy;
  R.kfx=hx+lf.kx;R.kfy=hyy+lf.ky;R.ffx=hx+lf.fx;R.ffy=hyy+lf.fy;R.kbx=hx+lb.kx;R.kby=hyy+lb.ky;R.fbx=hx+lb.fx;R.fby=hyy+lb.fy;
  const tl=TORSO*(1+(this.breath||0)*.012);R.sx=hx+Math.sin(P.lean)*tl;R.sy=hyy-Math.cos(P.lean)*tl;
  const hd=P.lean+P.head;R.cx=R.sx+Math.sin(hd)*(HEADR+5);R.cy=R.sy-Math.cos(hd)*(HEADR+5);
  R.efx=R.sx+Math.cos(P.f1)*UARM;R.efy=R.sy+Math.sin(P.f1)*UARM;const fa=P.f1+P.f2;R.hfx=R.efx+Math.cos(fa)*FARM;R.hfy=R.efy+Math.sin(fa)*FARM;
  const wd=Math.cos(P.w),ws=Math.sin(P.w);R.gx=R.hfx;R.gy=R.hfy;R.bx=R.gx+wd*w.seg0;R.by=R.gy+ws*w.seg0;R.tx=R.gx+wd*w.len;R.ty=R.gy+ws*w.len;
  if(w.two){ik(R.sx,R.sy,R.gx-wd*15,R.gy-ws*15,UARM,FARM,this.ik);R.ebx=this.ik.ex;R.eby=this.ik.ey;R.hbx=this.ik.hx;R.hby=this.ik.hy}
  else{R.ebx=R.sx+Math.cos(P.b1)*UARM;R.eby=R.sy+Math.sin(P.b1)*UARM;const ba=P.b1+P.b2;R.hbx=R.ebx+Math.cos(ba)*FARM;R.hby=R.eby+Math.sin(ba)*FARM}
 }
 /* world-space weapon segment */
 seg(o){const R=this.rig,f=this.facing;o.bx=this.x+f*R.bx;o.by=this.y+R.by;o.tx=this.x+f*R.tx;o.ty=this.y+R.ty;return o}
 pushTrail(dt){const a=this.atk;const act=this.mode==='attack'&&a&&(a.phase===1||(a.phase===2&&a.t<.06));
  for(let i=this.trail.length-1;i>=0;i--){this.trail[i].age+=dt;if(this.trail[i].age>.17)this.trail.splice(i,1)}
  if(act){const R=this.rig,f=this.facing,s=this.seg({age:0});s.gx=this.x+f*R.gx;s.gy=this.y+R.gy;s.a=Math.atan2(Math.sin(this.pose.w),f*Math.cos(this.pose.w));this.trail.push(s);if(this.trail.length>14)this.trail.shift()}}
 /* ---------- network snapshot (host -> guest) ---------- */
 serialize(){const r=v=>Math.round(v*10)/10,a=this.atk;return[r(this.x),r(this.y),r(this.vx),r(this.vy),this.facing,r(this.hp),MODES.indexOf(this.mode),Math.round(this.modeT*100)/100,a?a.phase:-1,a?Math.round(a.t*1000)/1000:0,this.grounded?1:0,this.flash>0?1:0,this.hurtDur,a&&a.heavy?1:0,r(this.atkCd),r(this.hvCd)]}
 applySnap(s,G){this.sn=s;const mode=MODES[s[6]];this.hp=s[5];this.facing=s[4];this.grounded=!!s[10];this.hurtDur=s[12]||.3;this.snAge=0;this.atkCd=s[14]||0;this.hvCd=s[15]||0;
  if(mode!==this.mode){this.mode=mode}this.modeT=s[7];if(s[11])this.flash=.08;
  if(s[8]>=0){if(!this.atk){const f={};for(const k of KEYS)f[k]=this.pose[k];const T=this.atkTimes(!!s[13]);this.atk={phase:s[8],t:s[9],hit:false,from:f,heavy:!!s[13],W:T.W,S:T.S,R:T.R,dmg:T.dmg};if(s[13]&&s[8]===0)G.onAttackStart&&G.onAttackStart(this)}
   else{if(this.atk.phase!==s[8]&&s[8]===1){G.onSwing(this);this.prevSeg=null}this.atk.phase=s[8];this.atk.t=s[9]}}else this.atk=null;
  if(Math.abs(this.x-s[0])>90){this.x=s[0];this.y=s[1]}}
 guestTick(dt){const s=this.sn;if(s){this.snAge+=dt;const a=Math.min(this.snAge,.1),k=1-Math.exp(-dt*20);this.x+=(s[0]+s[2]*a-this.x)*k;this.y+=(s[1]+s[3]*a-this.y)*k;this.vx=s[2];this.vy=s[3]}
  this.modeT+=dt;this.flash-=dt;this.landT-=dt;this.dashCd=0;this.atkCd=Math.max(0,this.atkCd-dt);this.hvCd=Math.max(0,this.hvCd-dt);
  if(this.atk){this.atk.t+=dt;const lim=[this.atk.W,this.atk.S,this.atk.R][this.atk.phase];if(this.atk.t>lim)this.atk.t=lim}
  if(this.mode==='dash'){this.ghostT-=dt;if(this.ghostT<=0){this.ghostT=.03;this.ghosts.push({x:this.x,y:this.y,f:this.facing,a:.5});if(this.ghosts.length>5)this.ghosts.shift()}}}
 /* ---------- drawing ---------- */
 drawShadow(c){const h=clamp((GROUND-this.y)/160,0,1),rx=34*(1-h*.4),a=.5*(1-h*.6);if(this.mode==='ko'&&this.modeT>.2){}
  c.globalAlpha=a;c.fillStyle='#000';c.beginPath();c.ellipse(this.x,GROUND+5,rx,7*(1-h*.3),0,0,6.283);c.fill();
  c.globalCompositeOperation='lighter';c.globalAlpha=.12*(1-h);c.fillStyle=this.pal.accent;c.beginPath();c.ellipse(this.x,GROUND+5,rx*1.1,6,0,0,6.283);c.fill();c.globalCompositeOperation='source-over';c.globalAlpha=1}
 drawGhosts(c){for(const g of this.ghosts){c.globalAlpha=Math.max(0,g.a)*.45;c.fillStyle=this.pal.accent;c.save();c.translate(g.x,g.y);c.scale(g.f,1);
   c.beginPath();c.ellipse(4,-70,12,30,.25,0,6.283);c.fill();c.beginPath();c.arc(10,-110,10,0,6.283);c.fill();c.restore()}c.globalAlpha=1}
 drawTrail(c){const T=this.trail;if(T.length<2)return;const w=this.weapon,N=4;c.globalCompositeOperation='lighter';c.lineJoin='round';const col=this.pal.accent,bx=[],by=[],tx=[],ty=[];
  for(let i=1;i<T.length;i++){const a=T[i-1],b=T[i],k=1-b.age/.17;if(k<=0)continue;let da=b.a-a.a;while(da>Math.PI)da-=6.2832;while(da<-Math.PI)da+=6.2832;
   for(let j=0;j<=N;j++){const u=j/N,an=a.a+da*u,gx=a.gx+(b.gx-a.gx)*u,gy=a.gy+(b.gy-a.gy)*u,cx=Math.cos(an),cy=Math.sin(an);bx[j]=gx+cx*w.seg0;by[j]=gy+cy*w.seg0;tx[j]=gx+cx*w.len;ty[j]=gy+cy*w.len}
   c.globalAlpha=k*.5;c.fillStyle=col;c.beginPath();c.moveTo(bx[0],by[0]);for(let j=1;j<=N;j++)c.lineTo(bx[j],by[j]);for(let j=N;j>=0;j--)c.lineTo(tx[j],ty[j]);c.closePath();c.fill();
   c.globalAlpha=k*.95;c.strokeStyle='#fff';c.lineWidth=2.4;c.beginPath();c.moveTo(tx[0],ty[0]);for(let j=1;j<=N;j++)c.lineTo(tx[j],ty[j]);c.stroke()}
  c.globalAlpha=1;c.globalCompositeOperation='source-over'}
 draw(c){
  const R=this.rig,P=this.pose,pal=this.flash>0?PAL_FLASH:this.pal,w=this.weapon;
  const jx=this.shakeT>0?(Math.random()-.5)*5:0;
  c.save();c.translate(this.x+jx,this.y+this.yOff);c.scale(this.facing,1);
  if(this.rot){c.rotate(this.rot);c.translate(0,-7*Math.min(1,-this.rot))}
  c.lineCap='round';c.lineJoin='round';
  const chg=this.atk&&this.atk.heavy&&this.atk.phase===0;
  if(chg){const k=clamp(this.atk.t/this.atk.W,0,1);c.globalCompositeOperation='lighter';c.strokeStyle=this.pal.accent;c.fillStyle=this.pal.accent;
   c.globalAlpha=.12+.25*k;c.beginPath();c.arc(0,-62,34+14*k,0,6.283);c.fill();c.globalAlpha=.85*(1-k*.4);c.lineWidth=3;c.beginPath();c.arc(0,-62,82-48*k,0,6.283);c.stroke();
   c.globalAlpha=1;c.globalCompositeOperation='source-over'}
  // cape
  const cp=this.cape,ax=R.sx-3,ay=R.sy-4,bx=R.hx-6,by=R.hy-4;
  c.fillStyle=pal.cape;c.beginPath();c.moveTo(ax,ay);c.quadraticCurveTo(ax+cp.x*.35,ay+cp.y*.2,ax+cp.x,ay+cp.y);c.quadraticCurveTo(bx+cp.x*.6+8,by+cp.y*.6,bx,by+4);c.closePath();c.fill();
  c.strokeStyle=pal.trim;c.globalAlpha=.55;c.lineWidth=1.5;c.beginPath();c.moveTo(ax+cp.x,ay+cp.y);c.quadraticCurveTo(bx+cp.x*.6+8,by+cp.y*.6,bx,by+4);c.stroke();c.globalAlpha=1;
  const limb=(x0,y0,x1,y1,wd,col)=>{c.strokeStyle=col;c.lineWidth=wd;c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke()};
  const drawLeg=(kx,ky,fx,fy,col,col2)=>{limb(R.hx,R.hy,kx,ky,13,col);limb(kx,ky,fx,fy,10.5,col);c.fillStyle=col2;c.beginPath();c.arc(kx,ky,5.2,0,6.283);c.fill();limb(fx,fy,fx+11,fy+1,7,pal.dark)};
  if(!w.two){limb(R.sx,R.sy,R.ebx,R.eby,8,pal.dark);limb(R.ebx,R.eby,R.hbx,R.hby,7,pal.dark);c.fillStyle=pal.dark;c.beginPath();c.arc(R.hbx,R.hby,4.2,0,6.283);c.fill()}
  drawLeg(R.kbx,R.kby,R.fbx,R.fby,pal.dark,pal.armor);
  // torso
  c.save();c.translate(R.hx,R.hy);c.rotate(P.lean);
  c.fillStyle=pal.armor;c.beginPath();c.moveTo(-9,2);c.lineTo(9,2);c.quadraticCurveTo(14,-TORSO*.55,10,-TORSO+4);c.lineTo(-9,-TORSO+4);c.quadraticCurveTo(-13,-TORSO*.5,-9,2);c.fill();
  c.fillStyle=pal.armor2;c.globalAlpha=.7;c.fillRect(1,-TORSO+9,8,TORSO-20);c.globalAlpha=1;
  c.fillStyle=pal.cloth;c.beginPath();c.moveTo(-10,0);c.lineTo(10,0);c.lineTo(12,14);c.lineTo(0,18);c.lineTo(-12,13);c.closePath();c.fill();
  c.fillStyle=pal.trim;c.fillRect(-10,-8,20,3.5);c.beginPath();c.moveTo(3,-TORSO*.62);c.lineTo(7,-TORSO*.5);c.lineTo(3,-TORSO*.38);c.lineTo(-1,-TORSO*.5);c.closePath();c.fill();
  c.restore();
  // head
  c.save();c.translate(R.cx,R.cy);c.rotate(P.lean+P.head);
  const px=this.cape.x*.35,py=this.cape.y*.12;
  c.strokeStyle=pal.trim;c.lineWidth=4;c.beginPath();c.moveTo(-3,-HEADR+1);c.quadraticCurveTo(-10+px*.4,-HEADR-8,-16+px,-HEADR+3+py*.3);c.stroke();
  c.fillStyle=pal.armor;c.beginPath();c.arc(0,0,HEADR,0,6.283);c.fill();
  c.fillStyle=pal.armor2;c.beginPath();c.arc(0,0,HEADR,-2.9,-.9);c.lineTo(0,0);c.fill();
  c.fillStyle=pal.dark;c.beginPath();c.moveTo(1,-5);c.lineTo(HEADR+.5,-3);c.lineTo(HEADR-1,3);c.lineTo(1,4);c.closePath();c.fill();
  c.fillStyle=pal.trim;c.fillRect(4,-2.4,HEADR-3,2.6);
  c.restore();
  drawLeg(R.kfx,R.kfy,R.ffx,R.ffy,pal.armor,pal.armor2);
  // weapon (grip -> blade), glow while swinging
  const swinging=this.atk&&(this.atk.phase===1||this.atk.heavy&&this.atk.phase===0);
  c.save();c.translate(R.gx,R.gy);c.rotate(P.w);DF.drawWeapon(c,w.id,pal.accent,swinging?1:0);c.restore();
  limb(R.sx,R.sy,R.efx,R.efy,9,pal.armor);limb(R.efx,R.efy,R.hfx,R.hfy,8,pal.armor2);c.fillStyle=pal.metal;c.beginPath();c.arc(R.hfx,R.hfy,4.8,0,6.283);c.fill();
  if(w.two){limb(R.sx,R.sy,R.ebx,R.eby,8,pal.dark);limb(R.ebx,R.eby,R.hbx,R.hby,7,pal.dark);c.fillStyle=pal.metal;c.beginPath();c.arc(R.hbx,R.hby,4.4,0,6.283);c.fill()}
  c.fillStyle=pal.armor2;c.beginPath();c.arc(R.sx+1,R.sy+2,8.5,0,6.283);c.fill();c.strokeStyle=pal.trim;c.lineWidth=1.6;c.beginPath();c.arc(R.sx+1,R.sy+2,8.5,-2.6,-.4);c.stroke();
  c.restore();
 }
}
DF.Fighter=Fighter;DF.HVCD=HVCD;DF.GROUND=GROUND;DF.MODES=MODES;
})();
