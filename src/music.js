/* DuelForge - procedural battle music (WebAudio, no files). Starts in duel, stops elsewhere. */
(function(){
const DF=window.DF=window.DF||{};
let ctx,master,timer,step=0,on=false;
// D minor war theme: 8th-note bass ostinato + war drums + brass-like lead every 2 bars
const BASS=[38,38,45,38,41,38,45,43],LEAD=[62,65,69,67,65,62,60,62,69,72,70,69,67,65,64,62];
const hz=n=>440*Math.pow(2,(n-69)/12);
function tone(t,f,d,type,vol,lp){const o=ctx.createOscillator(),g=ctx.createGain(),fl=ctx.createBiquadFilter();o.type=type;o.frequency.value=f;fl.type='lowpass';fl.frequency.value=lp||1800;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(fl);fl.connect(g);g.connect(master);o.start(t);o.stop(t+d+.05)}
function drum(t,f,vol){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(f*2.2,t);o.frequency.exponentialRampToValueAtTime(f,t+.12);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.connect(g);g.connect(master);o.start(t);o.stop(t+.4)}
const BPM=148,S=60/BPM/2;let next=0;
function sched(){if(!on)return;while(next<ctx.currentTime+.4){const i=step%8,bar=(step/8|0)%2;
 tone(next,hz(BASS[i]),S*1.6,'sawtooth',.10,500);
 if(i%4===0)drum(next,70,.55);if(i===2||i===6)drum(next,110,.32);if(i%2)tone(next,hz(BASS[i]+24),.05,'square',.02,4000);
 if(i===0||i===4){const n=LEAD[(step/4|0)%16];tone(next,hz(n),S*3.6,'sawtooth',.05,1400);tone(next,hz(n-12),S*3.6,'square',.03,900)}
 next+=S;step++}}
DF.Music={
 start(){if(on)return;const S0=DF.SFX;if(S0&&S0.muted)return;try{ctx=ctx||new(window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();if(!master){master=ctx.createGain();master.connect(ctx.destination)}
  master.gain.cancelScheduledValues(0);master.gain.setValueAtTime(0,ctx.currentTime);master.gain.linearRampToValueAtTime(.7,ctx.currentTime+1.5);on=true;step=0;next=ctx.currentTime+.1;timer=setInterval(sched,100)}catch(e){}},
 stop(){if(!on)return;on=false;clearInterval(timer);try{master.gain.cancelScheduledValues(0);master.gain.linearRampToValueAtTime(0,ctx.currentTime+.6)}catch(e){}}
};
})();
