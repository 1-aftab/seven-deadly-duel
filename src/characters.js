/* Seven Deadly Duel - character roster / asset loader */
(function(){
'use strict';
const DF=window.DF=window.DF||{};
const R=[
 {id:'shadow',name:'SHADOW',title:'The Silent Blade',color:'#39b8ff',desc:'A hooded speed fighter who strikes fast and disappears.',stats:{attack:78,defense:62,speed:96,special:88},asset:'assets/characters/char1.png',atlas:'assets/characters/char1_atlas.png',preferredWeapon:'katana',anchor:{x:20,y:-94}},
 {id:'frost',name:'FROST',title:'The White Reaper',color:'#8fe7ff',desc:'A cold, precise duelist with relentless pressure.',stats:{attack:82,defense:60,speed:86,special:91},asset:'assets/characters/char2.png',atlas:'assets/characters/char2_atlas.png',preferredWeapon:'spear',anchor:{x:18,y:-94}},
 {id:'blaze',name:'BLAZE',title:'Crimson Edge',color:'#ff4d55',desc:'An aggressive fighter built around powerful attacks.',stats:{attack:94,defense:55,speed:78,special:89},asset:'assets/characters/char3.png',atlas:'assets/characters/char3_atlas.png',preferredWeapon:'greatblade',anchor:{x:19,y:-94}},
 {id:'volt',name:'VOLT',title:'Storm Dancer',color:'#4da8ff',desc:'A lightning-fast fighter with explosive specials.',stats:{attack:76,defense:58,speed:94,special:97},asset:'assets/characters/char4.png',atlas:'assets/characters/char4_atlas.png',preferredWeapon:'dagger',anchor:{x:20,y:-95}},
 {id:'titan',name:'TITAN',title:'Iron Warden',color:'#e3aa45',desc:'A heavily equipped warrior with crushing power.',stats:{attack:91,defense:92,speed:55,special:74},asset:'assets/characters/char5.png',atlas:'assets/characters/char5_atlas.png',preferredWeapon:'hammer',anchor:{x:18,y:-91}},
 {id:'nova',name:'NOVA',title:'Void Witch',color:'#a86cff',desc:'A mysterious fighter focused on ranged energy attacks.',stats:{attack:72,defense:58,speed:81,special:98},asset:'assets/characters/char6.png',atlas:'assets/characters/char6_atlas.png',preferredWeapon:'spear',anchor:{x:18,y:-94}},
 {id:'viper',name:'VIPER',title:'Night Fang',color:'#b25cff',desc:'A stealthy assassin with quick movement and counters.',stats:{attack:84,defense:57,speed:93,special:86},asset:'assets/characters/char7.png',atlas:'assets/characters/char7_atlas.png',preferredWeapon:'dagger',anchor:{x:20,y:-94}},
 {id:'zen',name:'ZEN',title:'Golden Runner',color:'#ffc84a',desc:'A mobile street fighter with balanced abilities.',stats:{attack:74,defense:68,speed:91,special:82},asset:'assets/characters/char8.png',atlas:'assets/characters/char8_atlas.png',preferredWeapon:'katana',anchor:{x:20,y:-94}},
 {id:'raven',name:'RAVEN',title:'Blood Rose',color:'#ff3f58',desc:'A fierce weapon fighter with devastating reach.',stats:{attack:90,defense:61,speed:80,special:93},asset:'assets/characters/char9.png',atlas:'assets/characters/char9_atlas.png',preferredWeapon:'axe',anchor:{x:19,y:-93}},
 {id:'oblivion',name:'OBLIVION',title:'The Last Eclipse',color:'#c78cff',desc:'A dark endgame-style fighter with overwhelming power.',stats:{attack:88,defense:76,speed:72,special:96},asset:'assets/characters/char10.png',atlas:'assets/characters/char10_atlas.png',preferredWeapon:'greatblade',anchor:{x:18,y:-92}}
];
const byId=Object.fromEntries(R.map(x=>[x.id,x]));
const images={},atlases={};
R.forEach(x=>{const im=new Image();im.decoding='async';im.src=x.asset;images[x.id]=im;const at=new Image();at.decoding='async';at.src=x.atlas||x.asset;atlases[x.id]=at});
function valid(id){return !!byId[id]}
function get(id){return byId[valid(id)?id:R[0].id]}
function random(exclude){const a=R.filter(x=>x.id!==exclude);return a[(Math.random()*a.length)|0].id}
function selected(){return DF.Progression?.state?.profile?.settings?.character_id||localStorage.getItem('duelforge.character')||R[0].id}
DF.Characters={list:R,get,valid,random,images,atlases,selected,default:R[0].id};
})();
