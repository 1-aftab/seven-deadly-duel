/* DuelForge — particles, screen shake, floaters and tiny synthesized SFX */
(function(){
const DF=window.DF=window.DF||{};
const FX={
 max:140,parts:[],floaters:[],shakeAmp:0,shakeX:0,shakeY:0,
 reset(){this.parts.length=0;this.floaters.length=0;this.shakeAmp=0},
 add(p){if(this.parts.length>=this.max)this.parts.shift();this.parts.push(p)},
 sparks(x,y,dir,n,col,spd){for(let i=0;i<n;i++){const a=(Math.random()-.5)*2.4+(dir>0?0:Math.PI);const s=(.4+Math.random())*spd;
   this.add({k:0,x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,life:.28+Math.random()*.25,max:.5,col})}},
 shards(x,y,n,col){for(let i=0;i<n;i++){const a=Math.random()*6.283,s=120+Math.random()*260;
   this.add({k:1,x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-120,life:.5+Math.random()*.4,max:.9,col,size:2+Math.random()*3})}},
 ring(x,y,col,r1,life){this.add({k:2,x,y,r1,life:life||.28,max:life||.28,col})},
 flare(x,y,col,size){this.add({k:3,x,y,rot:Math.random()*3,life:.14,max:.14,col,size})},
 dust(x,y,n,dir){for(let i=0;i<n;i++){this.add({k:4,x:x+(Math.random()-.5)*20,y,vx:(dir||(Math.random()-.5)*2)*(30+Math.random()*90)*(dir?1:1),vy:-20-Math.random()*50,life:.35+Math.random()*.3,max:.65,size:4+Math.random()*6})}},
 float(x,y,text,col){if(this.floaters.length>8)this.floaters.shift();this.floaters.push({x,y,text,col,life:.8,max:.8})},
 shake(a){this.shakeAmp=Math.max(this.shakeAmp,a)},
 update(dt){
  const P=this.parts;
  for(let i=P.length-1;i>=0;i--){const p=P[i];p.life-=dt;if(p.life<=0){P[i]=P[P.length-1];P.pop();continue}
   if(p.k===0||p.k===1){p.vy+=700*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*2);if(p.y>412&&p.k===1){p.y=412;p.vy*=-.35;p.vx*=.6}}
   else if(p.k===4){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*3);p.size+=dt*14}}
  const F=this.floaters;for(let i=F.length-1;i>=0;i--){const f=F[i];f.life-=dt;f.y-=46*dt;if(f.life<=0)F.splice(i,1)}
  this.shakeAmp*=Math.exp(-dt*9);if(this.shakeAmp<.05)this.shakeAmp=0;
  this.shakeX=(Math.random()-.5)*2*this.shakeAmp;this.shakeY=(Math.random()-.5)*2*this.shakeAmp;
 },
 draw(c){
  const P=this.parts;
  c.globalCompositeOperation='lighter';c.lineCap='round';
  for(let i=0;i<P.length;i++){const p=P[i];const a=Math.max(0,p.life/p.max);
   if(p.k===0){c.globalAlpha=a;c.strokeStyle=p.col;c.lineWidth=2.2;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-p.vx*.04,p.y-p.vy*.04);c.stroke()}
   else if(p.k===1){c.globalAlpha=a;c.fillStyle=p.col;c.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size)}
   else if(p.k===2){const t=1-a;c.globalAlpha=a*.9;c.strokeStyle=p.col;c.lineWidth=3*a+.5;c.beginPath();c.arc(p.x,p.y,6+p.r1*t,0,6.283);c.stroke()}
   else if(p.k===3){c.globalAlpha=a;c.strokeStyle=p.col;c.lineWidth=3;c.beginPath();const s=p.size*(1.2-a*.4);
     for(let j=0;j<6;j++){const an=p.rot+j*1.0472,l=j%2?s*.55:s;c.moveTo(p.x,p.y);c.lineTo(p.x+Math.cos(an)*l,p.y+Math.sin(an)*l)}c.stroke()}}
  c.globalCompositeOperation='source-over';
  for(let i=0;i<P.length;i++){const p=P[i];if(p.k!==4)continue;c.globalAlpha=Math.max(0,p.life/p.max)*.35;c.fillStyle='#b9bfd8';c.beginPath();c.arc(p.x,p.y,p.size,0,6.283);c.fill()}
  c.globalAlpha=1;
  const F=this.floaters;if(F.length){c.textAlign='center';c.font='900 22px system-ui,sans-serif';c.lineWidth=4;c.strokeStyle='#05060f';
   for(const f of F){c.globalAlpha=Math.min(1,f.life/f.max*1.6);c.strokeText(f.text,f.x,f.y);c.fillStyle=f.col;c.fillText(f.text,f.x,f.y)}c.globalAlpha=1}
 }
};
/* ---- SFX: pure WebAudio, no files ---- */
const SFX={ctx:null,muted:false,noise:null,
 init(){if(this.ctx||this.muted)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;this.ctx=new A();
   const n=this.ctx.sampleRate*.4,b=this.ctx.createBuffer(1,n,this.ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;this.noise=b}catch(e){}},
 resume(){if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume()},
 tone(f,dur,type,vol,slide){if(!this.ctx||this.muted)return;const c=this.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();
  o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+dur+.02)},
 hiss(dur,vol,f0,f1){if(!this.ctx||this.muted)return;const c=this.ctx,t=c.currentTime,s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();
  s.buffer=this.noise;fl.type='bandpass';fl.Q.value=1.2;fl.frequency.setValueAtTime(f0,t);fl.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+dur*.3);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(fl);fl.connect(g);g.connect(c.destination);s.start(t,Math.random()*.1,dur+.05)},
 swing(h){this.hiss(.16+h*.1,.22,h?500:1200,h?200:3000)},
 hit(h){this.tone(h?90:140,.18,'square',.18,.4);this.hiss(.1,.3,3500,800);if(h)this.tone(55,.3,'sine',.3,.5)},
 jump(){this.tone(260,.12,'sine',.07,1.8)},dash(){this.hiss(.18,.12,2500,500)},
 ko(){this.tone(180,.6,'sawtooth',.14,.25);this.hiss(.5,.2,2000,150)},
 charge(){this.tone(140,.55,'sawtooth',.07,3.2)},heavy(){this.tone(70,.4,'square',.2,.4);this.hiss(.28,.3,900,120)},
 ui(){this.tone(620,.07,'triangle',.08,1.3)},fight(){this.tone(300,.3,'sawtooth',.1,2);this.tone(450,.3,'square',.05,2)},
 win(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.tone(f,.3,'triangle',.12),i*110))}
};
DF.FX=FX;DF.SFX=SFX;
})();
