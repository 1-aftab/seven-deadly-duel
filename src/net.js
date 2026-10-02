/* DuelForge — serverless WebRTC (data channel) with copy/paste "room codes".
   No signaling server: the host's offer and the guest's answer are exchanged by hand (chat/QR/etc).
   To add automatic matchmaking later, implement DF.Net.signaling = {publish(role,code), onCode(cb)} on any free relay. */
(function(){
const DF=window.DF=window.DF||{};
const ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
const b64u={enc:u8=>{let s='';for(let i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')},
 dec:s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}};
async function pipe(u8,Stream){const s=new Blob([u8]).stream().pipeThrough(new Stream('deflate-raw'));return new Uint8Array(await new Response(s).arrayBuffer())}
async function encode(desc){const u8=new TextEncoder().encode(JSON.stringify({t:desc.type,s:desc.sdp}));
 if(window.CompressionStream){try{return'DF1-'+b64u.enc(await pipe(u8,CompressionStream))}catch(e){}}return'DF0-'+b64u.enc(u8)}
async function decode(code){code=(code||'').trim().replace(/\s+/g,'');const tag=code.slice(0,4),body=code.slice(4);let u8=b64u.dec(body);
 if(tag==='DF1-'){if(!window.DecompressionStream)throw new Error('This browser cannot read compressed codes');u8=await pipe(u8,DecompressionStream)}else if(tag!=='DF0-')throw new Error('Not a DuelForge code');
 const o=JSON.parse(new TextDecoder().decode(u8));return{type:o.t,sdp:o.s}}
function waitIce(pc){return new Promise(res=>{if(pc.iceGatheringState==='complete')return res();const done=()=>{pc.removeEventListener('icegatheringstatechange',chk);res()};
 const chk=()=>{if(pc.iceGatheringState==='complete')done()};pc.addEventListener('icegatheringstatechange',chk);setTimeout(done,5000)})}
const Net={pc:null,dc:null,role:null,open:false,signaling:null,onopen:null,onclose:null,onmessage:null,
 supported(){return!!window.RTCPeerConnection},
 _mk(){this.close();this.open=false;this.pc=new RTCPeerConnection({iceServers:ICE});
  this.pc.onconnectionstatechange=()=>{const s=this.pc&&this.pc.connectionState;if(s==='failed'||s==='closed'||s==='disconnected'){if(this.open){this.open=false;this.onclose&&this.onclose()}}}},
 _setup(dc){this.dc=dc;dc.onopen=()=>{this.open=true;this.onopen&&this.onopen()};dc.onclose=()=>{if(this.open){this.open=false;this.onclose&&this.onclose()}};
  dc.onmessage=e=>{try{this.onmessage&&this.onmessage(JSON.parse(e.data))}catch(x){}}},
 async createRoom(){this.role='host';this._mk();this._setup(this.pc.createDataChannel('duel',{ordered:true}));
  await this.pc.setLocalDescription(await this.pc.createOffer());await waitIce(this.pc);return encode(this.pc.localDescription)},
 async acceptAnswer(code){await this.pc.setRemoteDescription(await decode(code))},
 async joinRoom(code){this.role='guest';const d=await decode(code);this._mk();this.pc.ondatachannel=e=>this._setup(e.channel);
  await this.pc.setRemoteDescription(d);await this.pc.setLocalDescription(await this.pc.createAnswer());await waitIce(this.pc);return encode(this.pc.localDescription)},
 send(o){if(this.dc&&this.dc.readyState==='open'){try{this.dc.send(JSON.stringify(o))}catch(e){}}},
 close(){const o=this.open;this.open=false;try{this.dc&&this.dc.close()}catch(e){}try{this.pc&&this.pc.close()}catch(e){}this.dc=this.pc=null;return o}
};
DF.Net=Net;
})();
