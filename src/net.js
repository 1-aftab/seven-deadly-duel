/* DuelForge multiplayer — PeerJS/WebRTC transport.
   Keeps the existing room-code flow and game protocol, but lets PeerJS own
   signaling/ICE lifecycle instead of manually speaking the PeerServer socket protocol. */
(function(){
'use strict';
const DF=window.DF=window.DF||{};
const ICE=[
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'}
];
const PREFIX='dfrg26-';
const rnd=n=>{let s='';const a='abcdefghijklmnopqrstuvwxyz0123456789';for(let i=0;i<n;i++)s+=a[(Math.random()*a.length)|0];return s};

const Net={
  peer:null,conn:null,role:null,code:'',open:false,peerId:'',connecting:false,
  onopen:null,onclose:null,onmessage:null,onerror:null,onjoining:null,
  supported(){return !!(window.RTCPeerConnection&&window.WebSocket&&window.Peer)},
  _err(m){if(this.onerror)this.onerror(m)},
  _destroyPeer(){const p=this.peer;this.peer=null;this.peerId='';try{p&&p.destroy()}catch(e){}},
  _bindConn(conn){
    if(!conn)return;
    if(this.conn&&this.conn!==conn){try{conn.close()}catch(e){};return}
    this.conn=conn;this.connecting=true;
    if(this.role==='host'&&this.onjoining)this.onjoining();
    conn.on('open',()=>{
      this.open=true;this.connecting=false;
      if(this.onopen)this.onopen();
    });
    conn.on('data',data=>{
      try{this.onmessage&&this.onmessage(typeof data==='string'?JSON.parse(data):data)}catch(e){console.warn('Net message error',e)}
    });
    conn.on('close',()=>{
      const wasOpen=this.open;this.open=false;this.connecting=false;this.conn=null;
      if(wasOpen&&this.onclose)this.onclose();
    });
    conn.on('error',err=>{
      console.warn('Peer data connection error',err);
      if(!this.open)this._err('Could not establish the room connection. Check the room code and try again.');
    });
  },
  _makePeer(id){
    return new Promise((resolve,reject)=>{
      let settled=false;
      let p;
      try{p=new Peer(id,{config:{iceServers:ICE}})}catch(e){reject(e);return}
      this.peer=p;
      const fail=e=>{if(settled)return;settled=true;try{p.destroy()}catch(x){};if(this.peer===p)this.peer=null;reject(e||new Error('server'))};
      p.once('open',pid=>{if(settled)return;settled=true;this.peerId=pid;resolve(p)});
      p.on('error',err=>{if(!settled)fail(err);else console.warn('PeerJS error',err)});
      p.on('disconnected',()=>{
        if(this.open)return;
        if(this.role)this._err('Lost connection to the room server. Please create/join the room again.');
      });
      p.on('close',()=>{
        if(this.peer!==p)return;
        const wasOpen=this.open;this.open=false;this.peer=null;this.conn=null;
        if(wasOpen&&this.onclose)this.onclose();
      });
    });
  },
  async host(){
    this.close();this.role='host';
    for(let attempt=0;attempt<8;attempt++){
      const code=String(1000+((Math.random()*9000)|0));
      try{
        const p=await this._makePeer(PREFIX+code);
        this.code=code;
        p.on('connection',conn=>{
          if(this.conn||this.open){try{conn.close()}catch(e){};return}
          this.peer= p;this.peerId=p.id;this.code=code;this._bindConn(conn);
        });
        return code;
      }catch(e){
        const type=e&&e.type;
        this._destroyPeer();
        if(type!=='unavailable-id'&&type!=='unavailable-id'){
          this.role=null;
          throw new Error('Room server unreachable. Check your internet and try again.');
        }
      }
    }
    this.role=null;throw new Error('No free room codes right now. Try again.');
  },
  async join(code){
    this.close();this.role='guest';this.code=String(code).replace(/\D/g,'').slice(0,4);
    try{
      const p=await this._makePeer();
      const conn=p.connect(PREFIX+this.code,{reliable:true,serialization:'json'});
      this._bindConn(conn);
      return this.code;
    }catch(e){
      this.role=null;this._destroyPeer();
      if(e&&e.type==='peer-unavailable')throw new Error('Room not found or the host is offline. Check the 4-digit code.');
      throw new Error('Room server unreachable. Check your internet and try again.');
    }
  },
  send(o){if(this.conn&&this.conn.open){try{this.conn.send(o)}catch(e){}}},
  close(){
    const wasOpen=this.open;this.open=false;this.connecting=false;this.role=null;this.code='';
    const c=this.conn;this.conn=null;try{c&&c.close()}catch(e){}
    this._destroyPeer();
    return wasOpen;
  }
};
DF.Net=Net;
addEventListener('pagehide',()=>Net.close());
})();
