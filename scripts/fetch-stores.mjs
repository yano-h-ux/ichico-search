// 市川市公式の加盟店検索を全ページ取得し data/stores.json を更新する。
// 取得に失敗・件数不一致など異常があれば何も書き換えずにエラー終了する（サイトは前のデータのまま）。
import fs from 'node:fs';
const FILE = new URL('../data/stores.json', import.meta.url);
const BASE = 'https://www.city.ichikawa.lg.jp/ichico-store/?search_flg=1&page=';
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10); // JST
const decode = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n)).replace(/&nbsp;/g, ' ').trim();
const pick = (s, re) => decode(s.match(re)?.[1] ?? '');

async function get(url) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'ichico-search updater (family use)' } });
      if (!r.ok) throw Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) { if (i >= 3) throw Error(`${url}: ${e.message}`); await new Promise(r => setTimeout(r, 5000 * i)); }
  }
}

const stores = [];
let total = null;
for (let page = 1; page <= 100; page++) {
  const url = BASE + page, html = await get(url);
  if (page === 1) total = Number(html.match(/class="result_numbers">\s*([\d,]+)件中/)?.[1].replace(/,/g, ''));
  const blocks = [...html.matchAll(/<h2 class="l_title">([\s\S]*?)<\/h2>([\s\S]*?)<dl class="use">([\s\S]*?)<\/dl>/g)];
  if (!blocks.length) break;
  for (const [, name, mid, use] of blocks) {
    const rate = pick(mid, /<div class="rate1">([\s\S]*?)<\/div>/);
    if (rate !== '1%' && rate !== '5%') throw Error(`想定外の還元率 "${rate}"（${decode(name)}）`);
    stores.push({
      id: stores.length + 1, name: decode(name),
      address: pick(mid, /<dl class="address">[\s\S]*?<dd>([\s\S]*?)<\/dd>/),
      category: pick(mid, /<div class="ctg1">([\s\S]*?)<\/div>/),
      type: pick(mid, /<div class="ctg2">([\s\S]*?)<\/div>/),
      normalRate: rate === '1%' ? 1 : 5, campaignRate: rate === '1%' ? 10 : 30,
      cash: use.includes('現金併用可'), card: use.includes('カードタイプ利用可'), furusato: use.includes('ふるさとポイント利用可'),
      source: url,
    });
  }
  await new Promise(r => setTimeout(r, 1000)); // 市のサーバーに負担をかけない
}

const prev = JSON.parse(fs.readFileSync(FILE, 'utf8'));
if (!total || stores.length !== total) throw Error(`件数不一致: 取得${stores.length}件 / 公式表示${total}件`);
if (stores.length < prev.stores.length * 0.7) throw Error(`件数が急減（${prev.stores.length}→${stores.length}件）。誤取得の可能性があるため更新しません`);

const changed = JSON.stringify(prev.stores) !== JSON.stringify(stores);
fs.writeFileSync(FILE, JSON.stringify({ updated: changed ? today : prev.updated, checked: today, stores: changed ? stores : prev.stores }, null, 1) + '\n');
console.log(changed ? `データに変更あり: ${prev.stores.length}→${stores.length}件` : `変更なし（${stores.length}件）`);
