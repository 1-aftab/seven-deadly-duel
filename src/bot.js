/* DuelForge — simple, readable bot AI. Writes into fighter.input like a human would. */
(function(){
const DF=window.DF=window.DF||{};
class Bot{
 constructor(level){this.level=level||1;this.think=.4;this.intent='approach';this.hold=0;this.dir=0}
 update(dt,me,opp){
  const I=me.input;this.think-=dt;this.hold-=dt;
  if(me.mode!=='free'&&me.mode!=='attack'){I.left=I.right=false;return}
  const dx=opp.x-me.x,dist=Math.abs(dx),to=dx>0?1:-1,w=me.weapon,ow=opp.weapon;
  const range=w.range*.88,L=this.level;
  const oppSwinging=opp.mode==='attack'&&opp.atk&&opp.atk.phase<=1;
  const oppRecover=opp.mode==='attack'&&opp.atk&&opp.atk.phase===2||opp.mode==='hurt';
  const set=d=>{this.dir=d;I.left=d<0;I.right=d>0};
  // instant-ish reactions (gated by think timer so the bot isn't perfect)
  if(this.think<=0){
   this.think=.11+Math.random()*(.2-L*.02);
   const threat=oppSwinging&&dist<ow.range+30;
   if(threat&&Math.random()<.35+L*.06){
     const r=Math.random();
     this.intent='retreat';this.hold=.35;if(r<.28&&me.dashCd<=0){I.step=.12;set(-to)}else if(r<.55&&me.dashCd<=0){I.dash=.12;set(-to)}else if(r<.7&&me.grounded){I.jump=.12}
   }else if(oppRecover&&dist<range+10&&Math.random()<.8){this.intent='attack';if(me.hvCd<=0&&me.mode==='free'&&Math.random()<.45){I.heavy=.14}}
   else if(dist>range+140&&Math.random()<.25&&me.dashCd<=0){if(Math.random()<.45)I.step=.12;else I.dash=.12;set(to)}
   else if(dist>range){this.intent='approach';if(Math.random()<.08&&me.grounded){I.jump=.12}}
   else if(dist<range*.45&&Math.random()<.4){this.intent='retreat';this.hold=.25}
   else{this.intent=Math.random()<.5+L*.05?'attack':(Math.random()<.5?'wait':'retreat');this.hold=.2+Math.random()*.25}
  }
  if(this.intent==='approach')set(dist>range*.92?to:0);
  else if(this.intent==='retreat'){if(this.hold>0)set(-to);else this.intent='wait'}
  else if(this.intent==='attack'){set(dist>range?to:0);if(dist<=range+8&&me.mode==='free'&&I.attack<=0&&I.heavy<=0){if(me.hvCd<=0&&Math.random()<.18)I.heavy=.14;else if(me.atkCd<=0)I.attack=.14;else{this.intent='wait';this.hold=.12}if(I.attack>0||I.heavy>0){this.intent='wait';this.hold=.15+Math.random()*.3}}}
  else if(this.intent==='wait'){set(0);if(this.hold<=0)this.intent='approach'}
 }
}
DF.Bot=Bot;
})();
