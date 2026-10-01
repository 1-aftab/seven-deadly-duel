const state = {
  player: {name:"AFTAB", wins:0, coins:500},
  board: [
    {name:"ShadowKnight",wins:42,coins:18450},
    {name:"DarkBlade",wins:39,coins:19870},
    {name:"PixelWarrior",wins:35,coins:16420},
    {name:"KnightX",wins:31,coins:14900},
    {name:"VoidWalker",wins:27,coins:13100},
    {name:"IronWraith",wins:24,coins:11020}
  ],
  weapons:["IRON SWORD","DAGGER","WAR HAMMER","SPEAR","AXE","KATANA","GREATBLADE"],
  myRounds:0, botRounds:0, round:1, myHp:100, botHp:100, blocking:false, busy:true, botTimer:null
};

const $=id=>document.getElementById(id);
const screens=["home","challenge","leaderboard","duel","result"];
function show(id){screens.forEach(s=>$(s).classList.toggle("active",s===id)); if(id==="home") updateHome(); if(id==="leaderboard") renderBoard();}
function updateHome(){
  $("homeWins").textContent=state.player.wins; $("homeCoins").textContent=state.player.coins;
  const all=[...state.board,state.player].sort((a,b)=>b.wins-a.wins||b.coins-a.coins);
  $("homeRank").textContent="#"+(all.findIndex(x=>x===state.player)+1);
}
function renderBoard(){
  const all=[...state.board,state.player].sort((a,b)=>b.wins-a.wins||b.coins-a.coins);
  $("board").innerHTML='<div class="row header"><span>#</span><span>FIGHTER</span><span>WINS</span><span>COINS</span></div>'+
  all.map((x,i)=>`<div class="row ${x===state.player?"me":""}"><span class="rank">${i<3?["🥇","🥈","🥉"][i]:i+1}</span><b>${escapeHtml(x.name)}</b><b>${x.wins}</b><b class="coins">${x.coins.toLocaleString()}</b></div>`).join("");
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

$("botBtn").onclick=()=>startDuel("IRON WRAITH");
$("challengeBtn").onclick=()=>show("challenge");
$("leaderBtn").onclick=()=>show("leaderboard");
document.querySelectorAll("[data-home]").forEach(b=>b.onclick=()=>show("home"));
$("resultHome").onclick=()=>show("home");
$("rematchBtn").onclick=()=>startDuel("IRON WRAITH");
$("sendChallenge").onclick=()=>{
  const n=$("targetName").value.trim().replace(/^@/,"");
  if(!n){$("challengeMsg").textContent="Enter a username first.";return}
  $("challengeMsg").textContent=`Duel request sent to @${n}. Starting a local preview duel...`;
  setTimeout(()=>startDuel(n.toUpperCase()),700);
};

function startDuel(opponent){
  state.myRounds=0;state.botRounds=0;state.round=1;state.busy=true;
  $("enemyName").textContent=opponent||"IRON WRAITH"; show("duel"); beginRound();
}
function beginRound(){
  state.myHp=100;state.botHp=100;state.blocking=false;state.busy=true;
  $("myRounds").textContent=state.myRounds;$("botRounds").textContent=state.botRounds;
  $("roundNo").textContent=state.round;
  const myW=state.weapons[(state.round-1)%state.weapons.length];
  const botW=state.weapons[(state.round+2)%state.weapons.length];
  $("heroWeapon").textContent=myW;$("enemyWeapon").textContent=botW;$("weaponInfo").textContent=myW;
  setHp(); countdown(3);
}
function countdown(n){
  $("countdown").textContent=n;
  if(n>0){setTimeout(()=>countdown(n-1),650)}else{ $("countdown").textContent=""; state.busy=false; botThink(); }
}
function setHp(){
  $("heroHp").style.width=state.myHp+"%";$("enemyHp").style.width=state.botHp+"%";
  $("heroHpText").textContent=Math.max(0,Math.round(state.myHp));
  $("enemyHpText").textContent=Math.max(0,Math.round(state.botHp));
}
function flash(){
  $("hitFlash").animate([{opacity:.65},{opacity:0}],{duration:160});
}
function playerAttack(){
  if(state.busy)return;
  state.busy=true;
  const dmg=damageFor($("heroWeapon").textContent);
  const blocked=Math.random()<.18;
  state.botHp-=blocked?Math.round(dmg*.35):dmg;
  flash();setHp();
  setTimeout(()=>{state.busy=false;if(state.botHp<=0) roundEnd("player");else botThink()},230);
}
function botThink(){
  clearTimeout(state.botTimer);
  state.botTimer=setTimeout(()=>{
    if(state.myHp<=0||state.botHp<=0)return;
    const dmg=damageFor($("enemyWeapon").textContent);
    const blocked=state.blocking;
    state.myHp-=blocked?Math.round(dmg*.25):dmg;
    if(Math.random()<.22 && !state.blocking) state.botTimer=setTimeout(botThink,250);
    setHp();flash();
    if(state.myHp<=0)roundEnd("bot"); else state.busy=false;
  },350+Math.random()*550);
}
function damageFor(w){
  return {DAGGER:17,"IRON SWORD":15,"WAR HAMMER":25,SPEAR:18,AXE:22,KATANA:16,GREATBLADE:28}[w]||15;
}
function roundEnd(winner){
  state.busy=true;
  if(winner==="player")state.myRounds++;else state.botRounds++;
  $("myRounds").textContent=state.myRounds;$("botRounds").textContent=state.botRounds;
  if(state.myRounds>=4||state.botRounds>=4){setTimeout(()=>matchEnd(),500);return}
  state.round++;setTimeout(()=>beginRound(),850);
}
function matchEnd(){
  const won=state.myRounds>state.botRounds;
  if(won){state.player.wins++;state.player.coins+=150}
  else state.player.coins+=50;
  $("finalMy").textContent=state.myRounds;$("finalBot").textContent=state.botRounds;
  $("resultIcon").textContent=won?"🏆":"⚔️";$("resultEyebrow").textContent=won?"DUEL WON":"DUEL LOST";
  $("resultTitle").textContent=won?"VICTORY":"DEFEAT";$("rewardWins").textContent=won?"+1":"0";$("rewardCoins").textContent=won?"+150":"+50";
  show("result");
}

$("attackBtn").onclick=playerAttack;
$("blockBtn").onpointerdown=()=>{if(!state.busy)state.blocking=true};
$("blockBtn").onpointerup=()=>state.blocking=false;
$("blockBtn").onpointerleave=()=>state.blocking=false;
$("leftBtn").onclick=()=>nudge(-1);$("rightBtn").onclick=()=>nudge(1);
function nudge(dir){
  if(state.busy)return;
  const h=$("heroFighter"); const current=parseFloat(getComputedStyle(h).left); h.style.left=Math.max(0,Math.min(42,current+dir*2))+"%";
  setTimeout(()=>h.style.left="10%",180);
}
$("quitDuel").onclick=()=>{clearTimeout(state.botTimer);show("home")};
window.addEventListener("keydown",e=>{
  if(!$("duel").classList.contains("active"))return;
  if(e.key===" "){e.preventDefault();playerAttack()}
  if(e.key.toLowerCase()==="s")state.blocking=true;
  if(e.key.toLowerCase()==="a")nudge(-1);
  if(e.key.toLowerCase()==="d")nudge(1);
});
window.addEventListener("keyup",e=>{if(e.key.toLowerCase()==="s")state.blocking=false});
updateHome();
    
