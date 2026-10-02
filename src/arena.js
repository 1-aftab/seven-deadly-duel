/* DuelForge — procedural DARK MEDIEVAL arena: ashen sky, ringed black moon, a distant golden tree, banners, a crowd in the stands (pre-rendered layers + a few animated bits) */
(function(){
const DF=window.DF=window.DF||{};
const G=412;
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function layer(v,x0,y0,w,h,fn,q){const S=v.S*(q||1),cv=document.createElement('canvas');cv.width=Math.ceil(w*S);cv.height=Math.ceil(h*S);const c=cv.getContext('2d');
 c.setTransform(S,0,0,S,-x0*S,-y0*S);fn(c,x0,y0,w,h);return{cv,x0,y0,w,h}}
function glowSprite(col){const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');
 const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,col+'ff');g.addColorStop(.25,col+'88');g.addColorStop(1,col+'00');c.fillStyle=g;c.fillRect(0,0,128,128);return cv}
const TORCHES=[{x:96,c:'c'},{x:336,c:'c'},{x:624,c:'p'},{x:864,c:'p'}];
const COL={c:'#ffb454',p:'#ff4a2e'};
function ridge(seed,base,amp,x0,x1){const r=rng(seed),pts=[];let ph=r()*9,ph2=r()*9;for(let x=x0;x<=x1;x+=30){pts.push([x,base-amp*(.5+.5*Math.sin(x*.0075+ph))-amp*.5*Math.sin(x*.021+ph2)-amp*.25*r()])}return pts}
function ridgeY(pts,x){for(let i=1;i<pts.length;i++)if(pts[i][0]>=x){const a=pts[i-1],b=pts[i],t=(x-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t}return pts[pts.length-1][1]}
const Arena={lite:false,L:{},view:null,embers:[],motes:[],t:0,glow:{c:null,p:null},
 build(v){this.view=v;const hw=v.halfW+100,hh=v.halfH+40,x0=480-hw,y0=270-hh,w=hw*2,h=hh*2,L=this.L={};
  this.glow.c=glowSprite('#ffb454');this.glow.p=glowSprite('#ff4a2e');
  L.sky=layer(v,x0,y0,w,h,(c)=>{const g=c.createLinearGradient(0,y0,0,G);g.addColorStop(0,'#030202');g.addColorStop(.45,'#120b08');g.addColorStop(.75,'#2c170c');g.addColorStop(.92,'#69390f');g.addColorStop(1,'#a96a1c');
   c.fillStyle=g;c.fillRect(x0,y0,w,h);
   const blob=(x,y,r,col)=>{const q=c.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,col);q.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=q;c.fillRect(x-r,y-r,r*2,r*2)};
   blob(180,140,260,'rgba(120,50,20,.20)');blob(770,250,340,'rgba(255,170,60,.20)');blob(480,60,300,'rgba(90,40,30,.16)');
   const r=rng(7);for(let i=0;i<130;i++){const x=x0+r()*w,y=y0+r()*(G-60-y0),s=r()<.1?1.7:r()*.9+.5;c.globalAlpha=.35+r()*.65;c.fillStyle=r()<.2?'#ffd9a0':r()<.3?'#ffb08a':'#f3e6cc';c.fillRect(x,y,s,s)}c.globalAlpha=1});
  this.stars=[];const r=rng(21);for(let i=0;i<16;i++)this.stars.push({x:x0+r()*w,y:y0+20+r()*230,p:r()*6,s:1.5+r()*1.4});
  L.moon=layer(v,480,-90,500,400,(c)=>{const mx=600,my=112,R=44;let g=c.createRadialGradient(mx,my,R*.8,mx,my,R*3.6);g.addColorStop(0,'rgba(255,190,90,.38)');g.addColorStop(1,'rgba(255,190,90,0)');c.fillStyle=g;c.fillRect(480,-90,500,400);
   g=c.createRadialGradient(mx-10,my-10,4,mx,my,R);g.addColorStop(0,'#2a1d16');g.addColorStop(1,'#080504');c.fillStyle=g;c.beginPath();c.arc(mx,my,R,0,6.283);c.fill();
   c.strokeStyle='rgba(255,208,120,.95)';c.lineWidth=3;c.beginPath();c.arc(mx,my,R+1,0,6.283);c.stroke();c.strokeStyle='rgba(255,170,70,.35)';c.lineWidth=9;c.beginPath();c.arc(mx,my,R+5,0,6.283);c.stroke();
   c.strokeStyle='rgba(255,215,140,.55)';c.lineWidth=1.4;c.beginPath();c.ellipse(mx,my,R*1.9,R*.34,-.35,0,6.283);c.stroke()});
  const far=ridge(3,330,90,x0,x0+w);
  L.far=layer(v,x0,y0,w,h,(c)=>{const g=c.createLinearGradient(0,220,0,G);g.addColorStop(0,'#35231a');g.addColorStop(1,'#1a100c');c.fillStyle=g;c.beginPath();c.moveTo(x0,y0+h);far.forEach(p=>c.lineTo(p[0],p[1]));c.lineTo(x0+w,y0+h);c.fill();
   // ruined castle on the ridge
   const cx=210,by=ridgeY(far,cx)+6;c.fillStyle='#0f0a08';const tw=(x,w2,h2,roof)=>{c.fillRect(x,by-h2,w2,h2+30);if(roof){c.beginPath();c.moveTo(x-3,by-h2);c.lineTo(x+w2/2,by-h2-roof);c.lineTo(x+w2+3,by-h2);c.fill()}else for(let i=0;i<w2;i+=8)c.fillRect(x+i,by-h2-5,5,5)};
   tw(cx-60,34,62,30);tw(cx-18,64,44,0);tw(cx+40,26,86,34);tw(cx+70,40,50,0);tw(cx+104,22,70,24);
   // the great golden tree on the far hill (soft halo + branching canopy)
   {const tx=770,ty=ridgeY(far,tx)+8,hg=c.createRadialGradient(tx,ty-120,10,tx,ty-120,190);hg.addColorStop(0,'rgba(255,200,90,.42)');hg.addColorStop(1,'rgba(255,200,90,0)');c.fillStyle=hg;c.fillRect(tx-200,ty-320,400,340);
    const tr=rng(77);c.lineCap='round';
    const br=(x,y,len,ang,d)=>{const x2=x+Math.cos(ang)*len,y2=y+Math.sin(ang)*len;c.strokeStyle=d>3?'rgba(255,214,130,'+(.5+tr()*.3)+')':'rgba(230,170,70,.9)';c.lineWidth=Math.max(.6,d*1.35);c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();
     if(d<=0){c.fillStyle='rgba(255,226,150,.55)';c.fillRect(x2-1,y2-1,2.4,2.4);return}
     br(x2,y2,len*(.7+tr()*.12),ang-.42-tr()*.3,d-1);br(x2,y2,len*(.7+tr()*.12),ang+.42+tr()*.3,d-1);if(d>2&&tr()<.5)br(x2,y2,len*.6,ang+(tr()-.5)*.3,d-2)};
    br(tx,ty,46,-Math.PI/2,6);c.lineCap='butt'}
   const r=rng(5);[[-48,-40],[-4,-26],[14,-30],[48,-60],[54,-30],[110,-48],[84,-20]].forEach((q,i)=>{c.fillStyle=i%3===0?'#ff8a3a':'#ffd98a';c.globalAlpha=.55+r()*.4;c.fillRect(cx+q[0],by+q[1],3,5)});c.globalAlpha=1});
  const mid=ridge(11,372,64,x0,x0+w);
  L.mid=layer(v,x0,y0,w,h,(c)=>{const g=c.createLinearGradient(0,300,0,G);g.addColorStop(0,'#1b110c');g.addColorStop(1,'#0a0605');c.fillStyle=g;c.beginPath();c.moveTo(x0,y0+h);mid.forEach(p=>c.lineTo(p[0],p[1]));c.lineTo(x0+w,y0+h);c.fill();
   c.strokeStyle='rgba(224,160,70,.32)';c.lineWidth=1.5;c.beginPath();mid.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();
   const r=rng(33);c.fillStyle='#060403';for(let x=x0;x<x0+w;x+=11+r()*13){const y=ridgeY(mid,x)+10+r()*8,hh2=22+r()*28;c.beginPath();c.moveTo(x-7,y+16);c.lineTo(x,y-hh2+16);c.lineTo(x+7,y+16);c.fill()}});
  L.fog=layer(v,0,0,960,150,(c)=>{const r=rng(2);for(let i=0;i<9;i++){const x=i*120+r()*60,y=40+r()*70,rx=110+r()*90,g=c.createRadialGradient(x,y,0,x,y,rx);g.addColorStop(0,'rgba(190,160,120,.24)');g.addColorStop(1,'rgba(190,160,120,0)');c.fillStyle=g;c.save();c.translate(x,y);c.scale(1,.28);c.translate(-x,-y);c.fillRect(x-rx,y-rx,rx*2,rx*2);c.restore()}},.5);
  L.stage=layer(v,x0,y0,w,h,(c)=>{
   // back balustrade wall
   // tournament crowd: dark silhouettes behind the rail (heads, shoulders, a few raised arms and pennants)
   {const cr=rng(41);for(let row=0;row<2;row++)for(let x=x0-(x0%11)-(row*5);x<x0+w;x+=10+cr()*6){const hh=row?9:0,y=G-60+hh-cr()*5;c.fillStyle=row?'#120b08':'#0b0705';
     c.beginPath();c.arc(x,y,4.4,0,6.283);c.fill();c.fillRect(x-6,y+3,12,14);
     if(cr()<.12){c.fillRect(x+4,y-9,2.2,11)}
     if(cr()<.035){c.fillStyle='#5b1519';c.fillRect(x+6,y-24,2,20);c.beginPath();c.moveTo(x+8,y-24);c.lineTo(x+22,y-19);c.lineTo(x+8,y-14);c.fill()}}}
   c.fillStyle='#1c130d';c.fillRect(x0,G-52,w,52);c.fillStyle='#2e2015';c.fillRect(x0,G-52,w,5);
   c.fillStyle='#0e0905';for(let x=x0-(x0%48);x<x0+w;x+=48){c.fillRect(x,G-47,2,47)}
   c.fillStyle='#120c08';for(let x=x0-(x0%96);x<x0+w;x+=96){c.fillRect(x,G-34,48,2)}
      // hanging banners between the torch pillars
   [216,480,744].forEach((bx,k)=>{const top=G-212,bot=G-84,bw=34;c.fillStyle='#1c130d';c.fillRect(bx-bw/2-4,top-6,bw+8,5);c.fillStyle='#8f1d22';
    c.beginPath();c.moveTo(bx-bw/2,top);c.lineTo(bx+bw/2,top);c.lineTo(bx+bw/2,bot);c.lineTo(bx,bot-16);c.lineTo(bx-bw/2,bot);c.closePath();c.fill();
    c.fillStyle='rgba(0,0,0,.28)';c.fillRect(bx+2,top,bw/2-2,bot-top-8);c.strokeStyle='#c9a24f';c.lineWidth=2;c.beginPath();c.moveTo(bx-bw/2+3,top+3);c.lineTo(bx+bw/2-3,top+3);c.lineTo(bx+bw/2-3,bot-6);c.lineTo(bx,bot-19);c.lineTo(bx-bw/2+3,bot-6);c.closePath();c.stroke();
    c.fillStyle='#e0b85c';c.save();c.translate(bx,(top+bot)/2-8);if(k===1){c.beginPath();c.moveTo(0,-14);c.lineTo(9,0);c.lineTo(0,14);c.lineTo(-9,0);c.closePath();c.fill();c.fillStyle='#8f1d22';c.beginPath();c.arc(0,0,3.2,0,6.283);c.fill()}
    else{c.rotate(.78);c.fillRect(-1.8,-15,3.6,30);c.fillRect(-7,-4,14,3);c.rotate(-1.56);c.fillRect(-1.8,-15,3.6,30);c.fillRect(-7,-4,14,3)}c.restore()});
   TORCHES.forEach(t=>{c.fillStyle='#241a12';c.fillRect(t.x-14,G-130,28,130);c.fillStyle='#38281a';c.fillRect(t.x-17,G-134,34,8);c.fillRect(t.x-17,G-6,34,6);c.fillStyle='#0e0905';c.fillRect(t.x-14,G-130,4,130);
    c.fillStyle='#4a3a2a';c.fillRect(t.x-14,G-60,28,3);c.fillRect(t.x-14,G-30,28,3);c.fillStyle='#3a2c20';c.beginPath();c.moveTo(t.x-12,G-96);c.lineTo(t.x+12,G-96);c.lineTo(t.x+7,G-84);c.lineTo(t.x-7,G-84);c.fill()});
   // floor
   const g=c.createLinearGradient(0,G,0,G+130);g.addColorStop(0,'#33261a');g.addColorStop(1,'#0a0705');c.fillStyle=g;c.fillRect(x0,G,w,y0+h-G);
   c.strokeStyle='rgba(220,170,100,.11)';c.lineWidth=1;[8,20,38,64,100].forEach(d=>{c.beginPath();c.moveTo(x0,G+d);c.lineTo(x0+w,G+d);c.stroke()});
   for(let i=-14;i<=14;i++){c.beginPath();c.moveTo(480+i*34,G);c.lineTo(480+i*120,G+130);c.stroke()}
   c.fillStyle='rgba(214,164,80,.6)';c.fillRect(x0,G-1,w,2);
   const e=c.createLinearGradient(0,G,0,G+14);e.addColorStop(0,'rgba(214,164,80,.30)');e.addColorStop(1,'rgba(214,164,80,0)');c.fillStyle=e;c.fillRect(x0,G,w,14);
   // arena sigil
   c.save();c.translate(480,G+36);c.scale(1,.16);c.strokeStyle='rgba(176,40,40,.65)';c.lineWidth=5;c.beginPath();c.arc(0,0,250,0,6.283);c.stroke();
   c.strokeStyle='rgba(224,184,92,.6)';c.lineWidth=3;c.beginPath();c.arc(0,0,205,0,6.283);c.stroke();c.lineWidth=4;
   for(let i=0;i<12;i++){const a=i*.5236;c.beginPath();c.moveTo(Math.cos(a)*205,Math.sin(a)*205);c.lineTo(Math.cos(a)*250,Math.sin(a)*250);c.stroke()}
   c.beginPath();for(let i=0;i<6;i++){const a=i*1.0472+.3;c.lineTo(Math.cos(a)*205,Math.sin(a)*205)}c.closePath();c.stroke();c.restore()});
  const vg=document.createElement('canvas');vg.width=v.cw;vg.height=v.ch;const vc=vg.getContext('2d'),vgr=vc.createRadialGradient(v.cw/2,v.ch*.52,Math.min(v.cw,v.ch)*.35,v.cw/2,v.ch*.52,Math.max(v.cw,v.ch)*.75);
  vgr.addColorStop(0,'rgba(10,3,0,0)');vgr.addColorStop(1,'rgba(8,3,0,.8)');vc.fillStyle=vgr;vc.fillRect(0,0,v.cw,v.ch);this.vig=vg;
  if(!this.motes.length){const r=rng(9);for(let i=0;i<14;i++)this.motes.push({x:r()*960,y:200+r()*220,p:r()*6,s:.3+r()*.5,c:r()<.5?'#ffd68a':'#ff9a5a'})}
 },
 update(dt){this.t+=dt;const E=this.embers;
  if(E.length<(this.lite?8:26)&&Math.random()<dt*22){const t=TORCHES[(Math.random()*4)|0];E.push({x:t.x+(Math.random()-.5)*10,y:G-92,vx:(Math.random()-.5)*14,vy:-(26+Math.random()*40),life:1.2+Math.random()*1.5,max:2.5,c:COL[t.c],ph:Math.random()*6})}
  for(let i=E.length-1;i>=0;i--){const e=E[i];e.life-=dt;if(e.life<=0){E[i]=E[E.length-1];E.pop();continue}e.x+=(e.vx+Math.sin(this.t*3+e.ph)*10)*dt;e.y+=e.vy*dt}},
 draw(c,par){const L=this.L,t=this.t,v=this.view;if(!L.sky)return;
  const put=(l,k)=>c.drawImage(l.cv,l.x0-par*k,l.y0,l.w,l.h);
  put(L.sky,3);
  c.fillStyle='#fff';for(const s of this.stars){c.globalAlpha=.35+.65*Math.abs(Math.sin(t*1.6+s.p));c.fillRect(s.x-par*3,s.y,s.s,s.s)}c.globalAlpha=1;
  put(L.moon,7);put(L.far,14);
  if(!this.lite)this.fog(c,.16,t*5,236);put(L.mid,26);if(!this.lite)this.fog(c,.2,-t*9+300,300);
  put(L.stage,0);
  // torch light + flames
  c.globalCompositeOperation='lighter';
  for(let i=0;i<TORCHES.length;i++){const T=TORCHES[i],gs=this.glow[T.c],fl=.8+.2*Math.sin(t*13+i*2)+.1*Math.sin(t*23+i);
   c.globalAlpha=.5*fl;c.drawImage(gs,T.x-110,G-92-90,220,180);if(!this.lite){c.globalAlpha=.22*fl;c.drawImage(gs,T.x-190,G-12,380,48)}}
  c.globalCompositeOperation='source-over';
  for(let i=0;i<TORCHES.length;i++){const T=TORCHES[i],f=Math.sin(t*11+i*3)*.5+Math.sin(t*17.3+i)*.5,base=G-92,h=34+f*7,col=COL[T.c];
   c.fillStyle=col;c.globalAlpha=.9;c.beginPath();c.moveTo(T.x-9,base);c.bezierCurveTo(T.x-12,base-h*.5,T.x-3+f*4,base-h*.7,T.x+f*5,base-h);c.bezierCurveTo(T.x+4+f*2,base-h*.6,T.x+12,base-h*.4,T.x+9,base);c.closePath();c.fill();
   c.fillStyle='#fff';c.globalAlpha=.85;c.beginPath();c.moveTo(T.x-4,base);c.quadraticCurveTo(T.x-5,base-h*.45,T.x+f*2,base-h*.62);c.quadraticCurveTo(T.x+6,base-h*.4,T.x+4,base);c.fill();c.globalAlpha=1}
 },
 drawFront(c,par){ // embers, motes, front fog (world space)
  const t=this.t;c.globalCompositeOperation='lighter';
  for(const e of this.embers){c.globalAlpha=Math.min(1,e.life/e.max*2)*.9;c.fillStyle=e.c;c.fillRect(e.x,e.y,2.2,2.2)}
  if(!this.lite)for(const m of this.motes){const x=m.x+Math.sin(t*m.s+m.p)*40-par*34,y=m.y+Math.cos(t*m.s*1.3+m.p)*18;c.globalAlpha=.25+.35*Math.sin(t*2+m.p)**2;c.fillStyle=m.c;c.fillRect(x,y,2.5,2.5)}
  c.globalAlpha=1;c.globalCompositeOperation='source-over';if(!this.lite)this.fog(c,.12,t*14,G-30)},
 fog(c,a,off,y){const f=this.L.fog,x0=this.view?480-this.view.halfW-100:0,n=Math.ceil((this.view.halfW*2+200)/960)+1;let s=((off%960)+960)%960;c.globalAlpha=a;
  for(let i=0;i<n;i++)c.drawImage(f.cv,x0-960+s+i*960,y-60,960,150);c.globalAlpha=1}
};
DF.Arena=Arena;
})();
