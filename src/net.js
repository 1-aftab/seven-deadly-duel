/* DuelForge — peer-to-peer rooms with 4-digit codes.
   Signaling (only to exchange the WebRTC handshake) goes through the free public PeerJS broker over a plain WebSocket;
   the room code is simply the host's broker id ("dfrg26-" + 4 digits). Gameplay then runs directly peer-to-peer over a
   WebRTC data channel. No library, no backend of our own. Swap SIGNAL/ICE below to use your own broker or a TURN server. */
(function(){
const DF=window.DF=window.DF||{};
const SIGNAL='wss://0.peerjs.com/peerjs?key=peerjs';
const PREFIX='dfrg26-';
const ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]; // add a TURN server here for strict mobile networks
const rnd=n=>{let s='';const a='abcdefghijklmnopqrstuvwxyz0123456789';for(let i=0;i<n;i++)s+=a[(Math.random()*a.length)|0];return s};
const Net={ws:null,pc:null,dc:null,role:null,code:'',open:false,peer:null,cid:'',pend:[],hb:0,tmo:0,
 onopen:null,onclose:null,onmessage:null,onerror:null,
 supported(){return!!(window.RTCPeerConnection&&window.WebSocket)},
 _err(m){this.onerror&&this.onerror(m)},
 /* open a signaling socket registered under `id`; resolves when the broker says OPEN, rejects 'taken' / 'server' */
 _sig(id){return new Promise((res,rej)=>{let done=false,ws;
   try{ws=new WebSocket(SIGNAL+'&id='+id+'&token='+rnd(10))}catch(e){return rej(new Error('server'))}
   this.ws=ws;const fail=m=>{if(!done){done=true;rej(new Error(m))}};
   const t=setTimeout(()=>{fail('server');try{ws.close()}catch(e){}},9000);
   ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}
    switch(m.type){
     case'OPEN':if(!done){done=true;clearTimeout(t);clearInterval(this.hb);this.hb=setInterval(()=>this._tx({type:'HEARTBEAT'}),8000);res()}break;
     case'ID-TAKEN':clearTimeout(t);fail('taken');break;
     case'ERROR':case'INVALID-KEY':clearTimeout(t);fail('server');break;
     case'EXPIRE':if(this.role==='guest'&&!this.open)this._err('Room not found. Check the code and try again.');break;
     default:this._onSig(m)}};
   ws.onerror=()=>{clearTimeout(t);fail('server')};
   ws.onclose=()=>{clearTimeout(t);clearInterval(this.hb);if(!done)fail('server');else if(this.ws===ws&&!this.open&&this.role)this._err('Lost connection to the room server.')}})},
 _tx(o){if(this.ws&&this.ws.readyState===1)try{this.ws.send(JSON.stringify(o))}catch(e){}},
 _pc(){this.pc=new RTCPeerConnection({iceServers:ICE});this.pend=[];
  this.pc.onicecandidate=e=>{if(e.candidate&&this.peer)this._tx({type:'CANDIDATE',dst:this.peer,payload:{candidate:e.candidate.toJSON?e.candidate.toJSON():e.candidate,type:'data',connectionId:this.cid}})};
  this.pc.onconnectionstatechange=()=>{const s=this.pc&&this.pc.connectionState;if((s==='failed'||s==='closed'||s==='disconnected')){if(this.open){this.open=false;this.onclose&&this.onclose()}else if(s==='failed')this._err('Could not connect. Your network may block peer-to-peer play.')}}},
 _setup(dc){this.dc=dc;dc.onopen=()=>{this.open=true;clearTimeout(this.tmo);this._shutSig();this.onopen&&this.onopen()};
  dc.onclose=()=>{if(this.open){this.open=false;this.onclose&&this.onclose()}};
  dc.onmessage=e=>{try{this.onmessage&&this.onmessage(JSON.parse(e.data))}catch(x){}}},
 _shutSig(){clearInterval(this.hb);const w=this.ws;this.ws=null;try{w&&w.close()}catch(e){}},
 async _flush(){const p=this.pend;this.pend=[];for(const c of p)try{await this.pc.addIceCandidate(c)}catch(e){}},
 async _onSig(m){const p=m.payload||{};
  try{
   if(m.type==='OFFER'&&this.role==='host'){if(this.pc||this.open)return; // one opponent per room
     this.peer=m.src;this.cid=p.connectionId||'';this._pc();this.pc.ondatachannel=e=>this._setup(e.channel);
     await this.pc.setRemoteDescription(p.sdp);await this._flush();const a=await this.pc.createAnswer();await this.pc.setLocalDescription(a);
     this._tx({type:'ANSWER',dst:this.peer,payload:{sdp:{type:a.type,sdp:a.sdp},type:'data',connectionId:this.cid}});
     this.onjoining&&this.onjoining();
     this.tmo=setTimeout(()=>{if(!this.open){try{this.pc.close()}catch(e){}this.pc=null;this.peer=null;this._err('Opponent could not connect.')}},15000)}
   else if(m.type==='ANSWER'&&this.role==='guest'&&this.pc){await this.pc.setRemoteDescription(p.sdp);await this._flush()}
   else if(m.type==='CANDIDATE'&&this.pc&&p.candidate){if(this.pc.remoteDescription)await this.pc.addIceCandidate(p.candidate).catch(()=>{});else this.pend.push(p.candidate)}
  }catch(e){this._err('Connection error.')}},
 /* HOST: reserve a random free 4-digit code */
 async host(){this.close();this.role='host';
  for(let i=0;i<10;i++){const code=String(1000+((Math.random()*9000)|0));
   try{await this._sig(PREFIX+code);this.code=code;return code}catch(e){this._shutSig();if(e.message!=='taken'){this.role=null;throw new Error('Room server unreachable. Check your internet and try again.')}}}
  this.role=null;throw new Error('No free room codes right now. Try again.')},
 /* GUEST: join the room with that 4-digit code */
 async join(code){this.close();this.role='guest';this.code=code;this.peer=PREFIX+code;this.cid='dc_'+rnd(10);
  try{await this._sig(PREFIX+'g'+rnd(9))}catch(e){this.role=null;throw new Error('Room server unreachable. Check your internet and try again.')}
  this._pc();this._setup(this.pc.createDataChannel('duel',{ordered:true}));
  const o=await this.pc.createOffer();await this.pc.setLocalDescription(o);
  this._tx({type:'OFFER',dst:this.peer,payload:{sdp:{type:o.type,sdp:o.sdp},type:'data',connectionId:this.cid,label:'duel',reliable:true,serialization:'json'}});
  this.tmo=setTimeout(()=>{if(!this.open)this._err('Room not found or unreachable. Check the code.')},12000)},
 send(o){if(this.dc&&this.dc.readyState==='open'){try{this.dc.send(JSON.stringify(o))}catch(e){}}},
 close(){const o=this.open;this.open=false;clearTimeout(this.tmo);this._shutSig();try{this.dc&&this.dc.close()}catch(e){}try{this.pc&&this.pc.close()}catch(e){}
  this.dc=this.pc=null;this.peer=null;this.role=null;this.pend=[];return o}
};
DF.Net=Net;
})();
