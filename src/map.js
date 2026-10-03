'use strict';
// 地図表示（Leaflet＋国土地理院の淡色地図、無料・キー不要）。初めて「地図で見る」を押したときに読み込む。
(()=>{
const CDN='https://cdnjs.cloudflare.com/ajax/libs/';
const LIBS=[['leaflet/1.9.4/leaflet.min.css','leaflet/1.9.4/leaflet.min.js'],['leaflet.markercluster/1.5.3/MarkerCluster.min.css','leaflet.markercluster/1.5.3/MarkerCluster.Default.min.css','leaflet.markercluster/1.5.3/leaflet.markercluster.js']];
let map,layer,loading,lastKey='',showing=false,current=[],camp=true,meMarker;
const load=src=>new Promise((ok,ng)=>{const css=src.endsWith('.css'),el=document.createElement(css?'link':'script');if(css){el.rel='stylesheet';el.href=CDN+src;}else{el.src=CDN+src;}el.onload=ok;el.onerror=()=>ng(Error(src));document.head.append(el);});
async function ensure(){if(map)return;loading??=(async()=>{for(const set of LIBS)await Promise.all(set.map(load));})();await loading;
 map=L.map('map').setView([35.705,139.925],13);
 L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',{maxZoom:18,attribution:'<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>'}).addTo(map);
 layer=L.markerClusterGroup({maxClusterRadius:40,showCoverageOnHover:false,disableClusteringAtZoom:17}).addTo(map);}
const yn=v=>v?'<span class="yes">可</span>':'<span class="unknown">可の記載なし</span>';
function card(s){const r=camp?s.campaignRate:s.normalRate,hi=s.normalRate===5;return `<div class="pop"><span class="type">${esc(s.category)} / ${esc(s.type)}</span><h3>${esc(s.name)}</h3><span class="r ${hi?'':'lo'}">${camp?'期間中':'通常'} ${r}％還元</span><p>${esc(s.address)}</p>${s.geo==='approx'?'<p class="warn">※番地まで特定できず、おおよその位置です</p>':''}<p>現金併用：${yn(s.cash)}　専用カード：${yn(s.card)}</p><p>ふるさとポイント：${yn(s.furusato)}</p><div class="links"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('千葉県市川市'+s.address+' '+s.name)}" target="_blank" rel="noopener">Googleマップで開く</a>　<a href="${esc(s.source)}" target="_blank" rel="noopener">公式掲載</a></div></div>`;}
function draw(){if(!map||!showing)return;const key=current.map(s=>s.id).join(',')+camp;if(key===lastKey)return;lastKey=key;layer.clearLayers();
 // 同じ住所のお店は1つのピンにまとめ、タップで全店を表示する
 const groups=new Map();let none=0;for(const s of current){if(s.lat==null){none++;continue;}const k=s.lat+','+s.lng;if(groups.has(k))groups.get(k).push(s);else groups.set(k,[s]);}
 const markers=[];for(const list of groups.values()){const s=list[0],hi=list.some(x=>x.normalRate===5),approx=list.every(x=>x.geo==='approx');
  const m=L.marker([s.lat,s.lng],{icon:L.divIcon({className:'',html:`<div class="pin ${hi?'hi':'lo'}${approx?' approx':''}">${list.length>1?list.length:''}</div>`,iconSize:[24,24],iconAnchor:[12,12],popupAnchor:[0,-10]}),title:list.map(x=>x.name).join('、')});
  m.bindPopup(()=>(list.length>1?`<p class="many">同じ場所に${list.length}店</p>`:'')+list.map(card).join(''),{maxWidth:Math.min(280,map.getSize().x-70),autoPanPadding:[12,12]});markers.push(m);}
 layer.addLayers(markers);
 const shown=current.length-none;$('mapNote').textContent=`${shown.toLocaleString('ja-JP')}件を地図に表示。ピンをタップするとお店の情報が出ます。`+(none?`住所が「市内各所」などで場所を特定できない${none}件は地図に出ないため、リストで確認してください。`:'');
 if(markers.length&&current.length<stores.length)map.fitBounds(layer.getBounds(),{padding:[30,30],maxZoom:16});}
window.onRender=(list,c)=>{current=list;camp=c;$('legendHi').textContent=(c?30:5)+'％';$('legendLo').textContent=(c?10:1)+'％';draw();};
async function setView(m){showing=m;for(const [id,on] of [['viewList',!m],['viewMap',m]]){$(id).classList.toggle('selected',on);$(id).setAttribute('aria-pressed',String(on));}
 document.querySelector('.results-panel').classList.toggle('map-mode',m);$('mapWrap').hidden=!m;try{localStorage.setItem('ichicoView',m?'map':'list');}catch{}
 if(!m)return;if(!map)$('mapNote').textContent='地図を読み込んでいます…';try{await ensure();}catch{$('mapNote').textContent='地図を読み込めませんでした。通信環境を確認してください。';return;}map.invalidateSize();lastKey='';draw();}
$('viewList').addEventListener('click',()=>setView(false));$('viewMap').addEventListener('click',()=>setView(true));
$('locate').addEventListener('click',()=>{if(!map)return;if(!navigator.geolocation){alert('この端末では現在地を取得できません');return;}$('locate').textContent='取得中…';
 navigator.geolocation.getCurrentPosition(p=>{$('locate').textContent='現在地';const ll=[p.coords.latitude,p.coords.longitude];meMarker?.remove();meMarker=L.marker(ll,{icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[16,16],iconAnchor:[8,8]}),zIndexOffset:1000,title:'現在地'}).addTo(map);map.setView(ll,16);},
 ()=>{$('locate').textContent='現在地';alert('現在地を取得できませんでした。ブラウザで位置情報の利用を許可してください。');},{enableHighAccuracy:true,timeout:10000});});
let saved='';try{saved=localStorage.getItem('ichicoView');}catch{}if(saved==='map')setView(true);
})();
