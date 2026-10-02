/* DuelForge — weapon data + procedural weapon art */
(function(){
const DF=window.DF=window.DF||{};
const H=Math.PI/2;
// Neutral guard stance. All angles are radians, 0 = forward, +PI/2 = down.
const READY={lean:.08,head:0,f1:.9,f2:-1.15,b1:1.6,b2:-.8,w:-1.0,fT:H-.35,fK:.3,bT:H+.3,bK:.2};
const P=o=>Object.assign({},READY,o);

const WEAPONS={
 sword:{id:'sword',name:'SWORD',dmg:14,wind:.14,swing:.12,rec:.24,len:58,seg0:8,kb:300,up:90,stop:.08,shake:3.5,thick:8,speed:1,lunge:80,range:118,
  wp:P({lean:-.28,head:-.12,f1:-1.9,f2:.2,b1:-1.2,b2:-.3,w:-2.1,fT:H-.2,fK:.7,bT:H+.4,bK:.5}),
  ep:P({lean:.5,head:.15,f1:.45,f2:-.1,b1:-.5,b2:.3,w:.75,fT:H-.75,fK:.45,bT:H+.6,bK:.1})},
 dagger:{id:'dagger',name:'DAGGER',dmg:8,wind:.06,swing:.08,rec:.12,len:32,seg0:4,kb:150,up:0,stop:.05,shake:1.5,thick:7,speed:1.15,lunge:110,range:96,
  wp:P({lean:-.1,f1:1.7,f2:1.3,b1:.2,b2:.2,w:-.15,fT:H-.45,fK:.8,bT:H+.5,bK:.3}),
  ep:P({lean:.45,head:.1,f1:.15,f2:-.05,b1:-.8,b2:.5,w:.05,fT:H-.8,fK:.5,bT:H+.65,bK:.1})},
 hammer:{id:'hammer',name:'HAMMER',dmg:28,wind:.34,swing:.15,rec:.42,len:64,seg0:30,kb:560,up:260,stop:.14,shake:7,thick:15,speed:.82,lunge:60,range:126,two:true,
  wp:P({lean:-.35,head:-.15,f1:-2.05,f2:.25,b1:-1.4,b2:-.2,w:-2.35,fT:H-.15,fK:.8,bT:H+.45,bK:.6}),
  ep:P({lean:.62,head:.2,f1:.55,f2:-.05,b1:.2,b2:.2,w:1.1,fT:H-.8,fK:.55,bT:H+.65,bK:.1})},
 spear:{id:'spear',name:'SPEAR',dmg:13,wind:.16,swing:.10,rec:.26,len:112,seg0:60,kb:260,up:40,stop:.07,shake:3,thick:7,speed:.97,lunge:120,range:160,two:true,
  wp:P({lean:-.18,f1:1.85,f2:1.25,b1:1.0,b2:.4,w:-.12,fT:H-.4,fK:.7,bT:H+.55,bK:.4}),
  ep:P({lean:.42,head:.1,f1:.1,f2:-.02,b1:.5,b2:.2,w:.03,fT:H-.85,fK:.4,bT:H+.7,bK:.1})},
 axe:{id:'axe',name:'AXE',dmg:21,wind:.24,swing:.13,rec:.32,len:60,seg0:28,kb:400,up:150,stop:.10,shake:5,thick:13,speed:.93,lunge:60,range:120,
  wp:P({lean:-.3,head:-.14,f1:-2.0,f2:.2,b1:-1.3,b2:-.3,w:-2.2,fT:H-.2,fK:.75,bT:H+.4,bK:.55}),
  ep:P({lean:.55,head:.18,f1:.5,f2:-.1,b1:-.4,b2:.3,w:.9,fT:H-.8,fK:.5,bT:H+.62,bK:.1})},
 katana:{id:'katana',name:'KATANA',dmg:12,wind:.10,swing:.10,rec:.20,len:70,seg0:10,kb:210,up:60,stop:.06,shake:2.5,thick:6,speed:1.08,lunge:100,range:120,
  wp:P({lean:.25,head:.1,f1:1.5,f2:.3,b1:-.9,b2:.2,w:2.0,fT:H-.5,fK:.8,bT:H+.4,bK:.5}),
  ep:P({lean:-.12,head:-.1,f1:-.75,f2:-.2,b1:.6,b2:.3,w:-1.2,fT:H-.7,fK:.45,bT:H+.7,bK:.15})},
 greatblade:{id:'greatblade',name:'GREATBLADE',dmg:30,wind:.36,swing:.17,rec:.45,len:98,seg0:10,kb:520,up:220,stop:.14,shake:7,thick:10,speed:.85,lunge:70,range:155,two:true,
  wp:P({lean:-.33,head:-.15,f1:-2.0,f2:.25,b1:-1.4,b2:-.2,w:-2.25,fT:H-.15,fK:.8,bT:H+.45,bK:.6}),
  ep:P({lean:.58,head:.18,f1:.5,f2:-.08,b1:.1,b2:.2,w:.85,fT:H-.8,fK:.5,bT:H+.65,bK:.1})}
};
const ORDER=['sword','dagger','hammer','spear','axe','katana','greatblade'];
for(const k of ORDER){const w=WEAPONS[k];const tot=w.wind+w.swing+w.rec;
 w.stats={dmg:w.dmg/30,spd:Math.max(.05,1-tot/1.1),rng:Math.min(1,(w.len+34)/150)};}

/* ---- procedural art: origin = grip, blade along +x ---- */
const STEEL='#dce9ff',STEEL2='#8fa6c8',DARK='#2b2f45',GOLD='#d8b25a';
function blade(c,x0,x1,w0,w1,tipRound,glowCol,glow){
 c.beginPath();c.moveTo(x0,-w0);c.lineTo(x1-tipRound,-w1);c.lineTo(x1,0);c.lineTo(x1-tipRound,w1);c.lineTo(x0,w0);c.closePath();
 c.fillStyle=STEEL;c.fill();
 c.fillStyle=STEEL2;c.beginPath();c.moveTo(x0,0);c.lineTo(x1-tipRound,w1);c.lineTo(x1,0);c.lineTo(x0,0);c.fill();
 c.strokeStyle=glowCol;c.globalAlpha=.55+glow*.45;c.lineWidth=1.4;c.beginPath();c.moveTo(x0,-w0);c.lineTo(x1-tipRound,-w1);c.lineTo(x1,0);c.stroke();c.globalAlpha=1;
}
const ART={
 sword(c,a,g){c.fillStyle=DARK;c.fillRect(-10,-2.5,11,5);c.fillStyle=GOLD;c.beginPath();c.arc(-11,0,3.2,0,6.3);c.fill();
  c.fillStyle=GOLD;c.fillRect(1,-8,4,16);blade(c,5,58,4.4,3.4,9,a,g);
  c.strokeStyle='#fff';c.globalAlpha=.6;c.lineWidth=1;c.beginPath();c.moveTo(9,0);c.lineTo(46,0);c.stroke();c.globalAlpha=1;},
 dagger(c,a,g){c.fillStyle=DARK;c.fillRect(-8,-2.2,9,4.4);c.fillStyle=GOLD;c.fillRect(1,-5.5,3,11);blade(c,4,32,3.4,2.4,7,a,g);},
 hammer(c,a,g){c.fillStyle='#4a3a30';c.fillRect(-12,-2.8,64,5.6);c.fillStyle=GOLD;c.fillRect(-12,-3.4,4,6.8);
  c.fillStyle='#434a66';c.fillRect(42,-15,24,30);c.fillStyle='#6c7699';c.fillRect(42,-15,24,8);
  c.fillStyle=a;c.globalAlpha=.8+g*.2;c.fillRect(48,-2,12,4);c.globalAlpha=1;c.fillStyle='#20233a';c.fillRect(42,11,24,4);},
 spear(c,a,g){c.fillStyle='#4a3a30';c.fillRect(-26,-2.3,92,4.6);c.fillStyle=a;c.beginPath();c.moveTo(60,-3);c.lineTo(72,-9);c.lineTo(68,0);c.lineTo(72,9);c.lineTo(60,3);c.fill();
  c.fillStyle=STEEL;c.beginPath();c.moveTo(66,-2.8);c.lineTo(88,-7);c.lineTo(112,0);c.lineTo(88,7);c.lineTo(66,2.8);c.closePath();c.fill();
  c.fillStyle=STEEL2;c.beginPath();c.moveTo(66,0);c.lineTo(88,7);c.lineTo(112,0);c.fill();c.fillStyle=GOLD;c.fillRect(64,-4,3,8);},
 axe(c,a,g){c.fillStyle='#4a3a30';c.fillRect(-10,-2.6,62,5.2);
  c.beginPath();c.moveTo(34,-3);c.quadraticCurveTo(38,-22,58,-22);c.quadraticCurveTo(66,-8,60,0);c.quadraticCurveTo(66,8,58,22);c.quadraticCurveTo(38,22,34,3);c.closePath();
  c.fillStyle=STEEL;c.fill();c.strokeStyle=a;c.globalAlpha=.6+g*.4;c.lineWidth=1.6;c.beginPath();c.moveTo(58,-22);c.quadraticCurveTo(66,-8,60,0);c.quadraticCurveTo(66,8,58,22);c.stroke();c.globalAlpha=1;
  c.fillStyle=STEEL2;c.fillRect(34,-3,10,6);},
 katana(c,a,g){c.fillStyle='#252a44';c.fillRect(-16,-2.6,17,5.2);c.fillStyle='#d6396f';c.globalAlpha=.8;for(let i=-14;i<0;i+=4)c.fillRect(i,-2.6,1.4,5.2);c.globalAlpha=1;
  c.fillStyle=GOLD;c.beginPath();c.ellipse(2,0,2.2,6,0,0,6.3);c.fill();
  c.beginPath();c.moveTo(4,-2.6);c.quadraticCurveTo(40,-5.5,72,-9);c.lineTo(73,-5);c.quadraticCurveTo(40,2.6,4,2.6);c.closePath();c.fillStyle=STEEL;c.fill();
  c.strokeStyle=a;c.globalAlpha=.6+g*.4;c.lineWidth=1.3;c.beginPath();c.moveTo(4,-2.6);c.quadraticCurveTo(40,-5.5,72,-9);c.stroke();c.globalAlpha=1;},
 greatblade(c,a,g){c.fillStyle=DARK;c.fillRect(-14,-3,16,6);c.fillStyle=GOLD;c.beginPath();c.arc(-15,0,4,0,6.3);c.fill();c.fillRect(2,-11,5,22);
  blade(c,7,100,8,6.5,14,a,g);c.fillStyle=a;c.globalAlpha=.55+g*.45;for(let i=0;i<4;i++)c.fillRect(26+i*15,-1.6,7,3.2);c.globalAlpha=1;
  c.fillStyle='#fff';c.globalAlpha=.4;c.fillRect(12,-.6,76,1.2);c.globalAlpha=1;}
};
DF.WEAPONS=WEAPONS;DF.WEAPON_ORDER=ORDER;DF.READY=READY;
DF.drawWeapon=(c,id,accent,glow)=>ART[id](c,accent,glow||0);
})();
