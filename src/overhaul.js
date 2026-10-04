/* DuelForge v3 overhaul: futuristic roster, power-ups, graphics opening, sprint FX */
(function(){
const DF=window.DF=window.DF||{},$=id=>document.getElementById(id),LS=localStorage;
const mk=(id,name,title,a,b,acc,cape,trim)=>({id,name,title,color:acc,pal:{armor:a,armor2:b,dark:'#07101a',cloth:'#0d1b2b',cape,trim,metal:'#c8e6ff',accent:acc}});
const C=[mk('shadow','SHADOW','Silent Blade','#1b2a3d','#2d4766','#39d0ff','#0a6a99','#7be3ff'),mk('frost','FROST','White Reaper','#aac4d8','#d6ecfa','#8ff3ff','#4c86a8','#ffffff'),
mk('blaze','BLAZE','Crimson Edge','#4a1620','#7a2433','#ff4d55','#b01e2e','#ffb199'),mk('volt','VOLT','Storm Dancer','#1a2250','#2e3d99','#4d8bff','#2433a8','#e6f0ff'),
mk('titan','TITAN','Iron Warden','#4a4020','#7d6a2c','#ffc233','#8a6a10','#fff0b0'),mk('nova','NOVA','Void Witch','#2a1747','#4d2a85','#b46cff','#6a1fc0','#e9c9ff'),
mk('viper','VIPER','Night Fang','#12301f','#1f5c3a','#3dff9a','#0f7a44','#b9ffd9'),mk('zen','ZEN','Golden Runner','#4a3a14','#8a6d24','#ffe066','#c99a10','#fff7cf'),
mk('raven','RAVEN','Blood Rose','#3a0f2e','#6d1f58','#ff4fa8','#a0176f','#ffc2e4'),mk('oblivion','OBLIVION','Last Eclipse','#101018','#2a2a3d','#e0e6ff','#3b3b5c','#8c9bff')];
if(DF.Characters){DF.Characters.list=C;DF.Characters.get=id=>C.find(x=>x.id===id)||C[0];DF.Characters.selected=()=>LS['df.char']||'shadow'}
const POW={star:{type:'star',name:'NINJA STAR',icon:'✶',desc:'Hurl a spinning star. Fast, low damage, short cooldown.',cooldown:4,dmg:9},
beam:{type:'beam',name:'POWER BEAM',icon:'═',desc:'Charge, then fire a long beam. Heavy damage.',cooldown:9,dmg:24},
shield:{type:'shield',name:'ENERGY SHIELD',icon:'◯',desc:'Cut damage taken by 50% for 4 seconds.',cooldown:10,duration:4,defense:.5}};
const myPow=()=>LS['df.pow']||'star';
const PR=[];let beams=[];
const M=()=>DF.Match;
function hit(att,def,dmg,kb){const m=M();if(!def||def.mode==='ko'||def.inv>0||m.mode==='guest')return;
 const sh=def.powerKind==='shield'&&def.powerT>0;dmg=Math.max(1,Math.round(dmg*(sh?.5:1)));def.hp=Math.max(0,def.hp-dmg);const ko=def.hp<=0,dir=def.x>=att.x?1:-1;
 ko?def.die(dir,kb):def.hurt(dir,kb,60,.25);m.fxHit(att.side,def.x,def.y-70,dmg,ko,dir,false)}
const foe=f=>{const m=M();return f===m.p1?m.p2:m.p1};
DF.Ov={
 onStart(){const m=M(),pc=C.find(x=>x.id===(LS['df.char']||'shadow')),bc=C[(Math.random()*C.length)|0];
  m.p1.pal=Object.assign({},pc.pal);m.p2.pal=Object.assign({},bc.pal);PR.length=0;beams=[];
  const give=(f,k)=>{f.mods=Object.assign({},f.mods||{});f.mods.power={name:POW[k].name,stats:POW[k]}};
  give(m.p1,myPow());if(m.mode==='bot')give(m.p2,Object.keys(POW)[(Math.random()*3)|0])},
 power(f,type){const d=POW[type];if(!d)return;const o=foe(f);
  if(type==='star')PR.push({x:f.x+f.facing*40,y:f.y-75,v:f.facing*760,f,t:0,life:1.1});
  if(type==='beam')beams.push({f,t:-.3,fired:false});
  if(type==='shield'){DF.FX.ring(f.x,f.y-70,'#7be3ff',90,.5)}},
 update(dt){const m=M();if(!m)return;
  for(let i=PR.length-1;i>=0;i--){const p=PR[i],o=foe(p.f);p.x+=p.v*dt;p.t+=dt;
   if(Math.abs(p.x-o.x)<34&&Math.abs(p.y-(o.y-70))<62){hit(p.f,o,POW.star.dmg,260);PR.splice(i,1)}else if(p.t>p.life||p.x<0||p.x>960)PR.splice(i,1)}
  for(let i=beams.length-1;i>=0;i--){const b=beams[i];b.t+=dt;if(b.t>=0&&!b.fired){b.fired=true;const o=foe(b.f),dx=(o.x-b.f.x)*b.f.facing;
    if(dx>0&&dx<560&&Math.abs(o.y-b.f.y)<110)hit(b.f,o,POW.beam.dmg,520);DF.FX.shake(5)}
   if(b.t>.3)beams.splice(i,1)}
  if(!document.body.classList.contains('lowfx'))for(const f of[m.p1,m.p2])if(f.runT>.6&&Math.random()<.35)DF.FX.sparks(f.x-f.facing*20,f.y-4,-f.facing,1,'#9fdcff',140)},
 draw(c){const m=M();c.save();c.globalCompositeOperation='lighter';
  for(const p of PR){c.save();c.translate(p.x,p.y);c.rotate(p.t*30);c.fillStyle='#bff4ff';c.shadowColor='#39d0ff';c.shadowBlur=14;c.beginPath();for(let i=0;i<8;i++){const r=i%2?5:16,a=i*Math.PI/4;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.fill();c.restore()}
  for(const b of beams){const f=b.f,y=f.y-75,x=f.x+f.facing*30;if(b.t<0){c.fillStyle='#9ff';c.globalAlpha=.4+(b.t+.3)*2;c.beginPath();c.arc(x,y,8+(b.t+.3)*50,0,6.3);c.fill()}else{c.globalAlpha=1-b.t/.3;const L=560*f.facing;c.fillStyle='#39d0ff';c.fillRect(Math.min(x,x+L),y-14,Math.abs(L),28);c.fillStyle='#fff';c.fillRect(Math.min(x,x+L),y-5,Math.abs(L),10)}}
  c.globalAlpha=1;for(const f of[m.p1,m.p2])if(f.powerKind==='shield'&&f.powerT>0){c.strokeStyle='#7be3ff';c.fillStyle='#39d0ff22';c.lineWidth=3;c.globalAlpha=.6+Math.sin(f.powerT*12)*.2;c.beginPath();c.arc(f.x,f.y-70,62,0,6.3);c.fill();c.stroke()}
  c.restore()}};
/* ---------- UI: characters tab, powers tab, graphics opening ---------- */
function modal(title,body){let m=$('ovModal');if(!m){m=document.createElement('div');m.id='ovModal';document.body.appendChild(m)}
 m.innerHTML=`<div class="ov-box"><h2>${title}</h2><div class="ov-grid">${body}</div><button class="ov-x">CLOSE</button></div>`;m.style.display='flex';m.querySelector('.ov-x').onclick=()=>m.style.display='none';return m}
function swatch(p){return `background:linear-gradient(135deg,${p.armor},${p.armor2} 55%,${p.accent})`}
function openChars(){const cur=LS['df.char']||'shadow',m=modal('CHARACTERS',C.map(x=>`<button class="ov-card${x.id===cur?' on':''}" data-id="${x.id}"><i class="sw" style="${swatch(x.pal)};box-shadow:0 0 18px ${x.color}"></i><b>${x.name}</b><small>${x.title}</small></button>`).join(''));
 m.querySelectorAll('.ov-card').forEach(b=>b.onclick=()=>{LS['df.char']=b.dataset.id;openChars()})}
function openPows(){const cur=myPow(),m=modal('POWER-UPS (equip one)',Object.keys(POW).map(k=>`<button class="ov-card wide${k===cur?' on':''}" data-id="${k}"><span class="ic">${POW[k].icon}</span><b>${POW[k].name}</b><small>${POW[k].desc} Press K in a duel.</small></button>`).join(''));
 m.querySelectorAll('.ov-card').forEach(b=>b.onclick=()=>{LS['df.pow']=b.dataset.id;openPows()})}
function dock(){const h=$('home');if(!h||$('ovDock'))return;const d=document.createElement('div');d.id='ovDock';d.innerHTML='<button id="ovC">◈ CHARACTERS</button><button id="ovP">✦ POWER-UPS</button>';h.appendChild(d);$('ovC').onclick=openChars;$('ovP').onclick=openPows}
function gfxOpening(){if(LS['df.gfx'])return;const m=modal('GRAPHICS QUALITY','<button class="ov-card wide" data-g="low"><b>LOW</b><small>Best for older phones & laptops</small></button><button class="ov-card wide" data-g="med"><b>MEDIUM</b><small>Balanced</small></button><button class="ov-card wide" data-g="high"><b>HIGH</b><small>Full effects</small></button>');
 m.querySelector('.ov-x').remove();m.querySelectorAll('.ov-card').forEach(b=>b.onclick=()=>{LS['df.gfx']=1;const t=document.querySelector('#setGfx button[data-g="'+b.dataset.g+'"]');t&&t.click();m.style.display='none'})}
addEventListener('DOMContentLoaded',()=>{dock();gfxOpening()});
})();
