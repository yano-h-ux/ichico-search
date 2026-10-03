// src/ と data/stores.json から、データ込みの1ファイル版 _site/index.html を作る。
import fs from 'node:fs';
const r = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const meta = JSON.parse(r('data/stores.json'));
const geo = JSON.parse(r('data/geocode.json'));
for (const s of meta.stores) { const g = geo[s.address]; if (g) Object.assign(s, { lat: g.lat, lng: g.lng, geo: g.level }); }
const dot = d => d.replaceAll('-', '.');
const vals = {
  CSS: r('src/style.css'), JS: r('src/app.js'), MAPJS: r('src/map.js'),
  DATA: JSON.stringify(meta).replace(/</g, '\u003c'),
  COUNT: meta.stores.length.toLocaleString('ja-JP'), UPDATED: dot(meta.updated), CHECKED: dot(meta.checked),
};
const html = r('src/index.html').replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in vals)) throw Error(m); return vals[k]; });
fs.mkdirSync(new URL('../_site', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../_site/index.html', import.meta.url), html);
console.log(`built _site/index.html (${meta.stores.length}件, 更新${meta.updated}, 確認${meta.checked})`);
