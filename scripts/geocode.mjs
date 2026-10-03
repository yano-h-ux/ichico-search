// 住所 → 緯度経度（国土地理院の住所検索APIを利用、無料・キー不要）。
// 結果は data/geocode.json に住所ごとに保存し、新しい住所だけを問い合わせる。
import fs from 'node:fs';
const FILE = new URL('../data/geocode.json', import.meta.url);
const { stores } = JSON.parse(fs.readFileSync(new URL('../data/stores.json', import.meta.url), 'utf8'));
const cache = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function search(q) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + encodeURIComponent(q));
      if (!r.ok) throw Error('HTTP ' + r.status);
      return (await r.json()).filter(f => f.properties.title.startsWith('千葉県市川市'));
    } catch (e) { if (i >= 3) throw e; await sleep(5000 * i); }
  }
}

// 建物名などを除いた「町名＋番地」部分を取り出す
function clean(address) {
  const a = address.normalize('NFKC').replace(/^(千葉県)?市川市/, '').replace(/[ー－‐−]/g, '-').trim();
  return a.split(/[\s(（]/)[0].replace(/番地?$/, '');
}

let asked = 0, failed = 0;
for (const address of new Set(stores.map(s => s.address))) {
  if (address in cache) continue;
  if (!address || /各所|訪問/.test(address)) { cache[address] = null; continue; }
  let q = clean(address), level = 'exact', hits = [];
  let error = false;
  while (q) {
    try { hits = await search('千葉県市川市' + q); } catch { error = true; break; } // 通信失敗は次回やり直す
    asked++; await sleep(700);
    if (hits.length) break;
    const shorter = q.replace(/-?[^-]*$/, ''); // 末尾の番号を削って再検索（おおよその位置）
    if (shorter === q || !/\d/.test(shorter) && level === 'approx') break;
    q = shorter; level = 'approx';
  }
  if (error) { failed++; continue; }
  const [lng, lat] = hits[0]?.geometry.coordinates ?? [];
  cache[address] = hits.length ? { lat, lng, level } : null;
  if (asked % 50 === 0) { fs.writeFileSync(FILE, JSON.stringify(cache, null, 1)); console.log(`${asked}件問い合わせ済み`); }
}
fs.writeFileSync(FILE, JSON.stringify(cache, null, 1) + '\n');
const v = Object.values(cache);
console.log(`位置情報: 正確${v.filter(x => x?.level === 'exact').length} / おおよそ${v.filter(x => x?.level === 'approx').length} / 不明${v.filter(x => !x).length}（新規問い合わせ${asked}回、通信失敗で次回に回した住所${failed}件）`);
