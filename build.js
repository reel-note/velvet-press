/**
 * VELVET&PRESS ビルドスクリプト
 * reviews.json + template.html → index.html を自動生成
 * 
 * 使い方: node build.js
 */

const fs = require('fs');

// ============ ファイル読み込み ============
const reviews = JSON.parse(fs.readFileSync('reviews.json', 'utf8'));
const template = fs.readFileSync('template.html', 'utf8');

// ============ ポスタースタイル定義 (12種類) ============
// CSSクラス p-vlv01 〜 p-vlv12 に対応するHTMLマークアップ生成
function generatePosterMarkup(review, idx) {
  const id = `vlv${String(idx + 1).padStart(2, '0')}`;
  const style = review.posterStyle || ((idx % 12) + 1);
  const code = review.code;
  const actress = review.actress || review.title;
  const studio = review.studio || '';

  switch (style) {
    case 1: // velvet curtain (gold on dark purple)
      return `\`<div class="num">${code.replace('-', '—')}</div><div class="ttl">${actress}</div><div class="sub">${studio}</div>\``;
    case 2: // midnight gold (centered frame)
      return `\`<div class="frame"><div class="num">${code.replace('-', '·')}</div><div class="ttl">${actress}</div><div class="sub">${studio}</div></div>\``;
    case 3: // rose noir (vertical text)
      return `\`<div class="num">${code.replace('-', '—')}</div><div class="ttl">${actress.length <= 6 ? actress.split('').join('<br>') : actress.substring(0, 3) + '<br>' + actress.substring(3)}</div><div class="vert">${code}</div>\``;
    case 4: // silk emerald
      return `\`<div class="num">${code.replace('-', '·')}</div><div class="center"><div class="ttl">${String(idx + 1).padStart(2, '0')}</div><div class="sub">${actress} · ${studio}</div></div><div class="meta">${review.year} / ${review.runtime}MIN</div>\``;
    case 5: // copper smoke
      return `\`<div class="num">${code.replace('-', '—')}</div><div class="ttl">${actress}<small>${code}</small></div>\``;
    case 6: // blush noir
      return `\`<div class="center-block"></div><div class="num">${code.replace('-', '—')}</div><div class="ttl">${actress}</div>\``;
    case 7: // black diamond
      return `\`<div class="num">${code.replace('-', '·')}</div><div class="diamond"></div><div class="ttl">${actress}</div>\``;
    case 8: // moonlight
      return `\`<div class="moon"></div><div class="num">${code.replace('-', '—')}</div><div class="ttl">${actress}<br>${code}</div>\``;
    case 9: // burgundy classic
      return `\`<div class="num">${code.replace('-', '·')}</div><div class="center-block"><div class="ttl">${actress}</div><div class="line"></div><div class="sub">${studio}</div></div><div class="meta">${review.year}</div>\``;
    case 10: // electric
      return `\`<div class="num">${code.replace('-', '—')}</div><div class="ttl">${actress}<small>${code} · ${studio}</small></div>\``;
    case 11: // cream coral
      return `\`<div class="num">${code.replace('-', '·')}</div><div class="ttl">${actress.substring(0, 2)}<br>${actress.substring(2)}</div><div class="sub">${studio}</div>\``;
    case 12: // silver night
      return `\`<div class="num">${code.replace('-', '—')}</div><div class="ttl">${actress}</div>\``;
    default:
      return `\`<div class="num">${code}</div><div class="ttl">${actress}</div>\``;
  }
}

// ============ データ生成 ============
function generateDataSection(reviews) {
  const lines = [];

  // --- films array ---
  lines.push('// ============ FILM DATA (auto-generated from reviews.json) ============');
  lines.push('const films = [');
  reviews.forEach((r, i) => {
    const id = `vlv${String(i + 1).padStart(2, '0')}`;
    const posterClass = (i >= 12) ? `vlv${String((i % 12) + 1).padStart(2, '0')}` : null;
    const escape = (s) => (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const genreStr = r.genre.map(g => `"${escape(g)}"`).join(',');
    const tagsStr = r.tags.map(t => `"${escape(t)}"`).join(',');
    const bodyStr = `["${escape(r.body1)}","${escape(r.body2)}"]`;
    
    let line = `  {id:"${id}", code:"${escape(r.code)}", title:"${escape(r.title)}", orig:"${escape(r.code)}", director:"${escape(r.studio)}", studio:"${escape(r.studio)}", year:${r.year}, runtime:${r.runtime}, score:${r.score}, verdict:"${escape(r.verdict)}", genre:[${genreStr}],`;
    line += `\n    lead:"${escape(r.lead)}",`;
    line += `\n    body:${bodyStr},`;
    line += `\n    tags:[${tagsStr}]`;
    if (posterClass) {
      line += `, posterClass:"${posterClass}"`;
    }
    line += `}${i < reviews.length - 1 ? ',' : ''}`;
    lines.push(line);
  });
  lines.push('];');
  lines.push('');

  // --- posterMarkup ---
  lines.push('// ============ POSTER MARKUP ============');
  lines.push('const posterMarkup = {');
  reviews.forEach((r, i) => {
    const id = `vlv${String(i + 1).padStart(2, '0')}`;
    if (i < 12) {
      lines.push(`  ${id}: ${generatePosterMarkup(r, i)}${i < Math.min(reviews.length, 12) - 1 ? ',' : ''}`);
    }
  });
  lines.push('};');
  
  // Poster reuse for items 13+
  if (reviews.length > 12) {
    lines.push('// Reuse poster styles for items beyond 12');
    for (let i = 12; i < reviews.length; i++) {
      const id = `vlv${String(i + 1).padStart(2, '0')}`;
      const reuseId = `vlv${String((i % 12) + 1).padStart(2, '0')}`;
      lines.push(`posterMarkup.${id} = posterMarkup.${reuseId};`);
    }
  }
  lines.push('');

  // --- services (static) ---
  lines.push('// ============ STREAMING SERVICES ============');
  lines.push('const services = {');
  lines.push('  fanza:  {name:"FANZA",     short:"F", base:"https://www.dmm.co.jp/search/=/searchstr="},');
  lines.push('  dmm:    {name:"DMM TV",    short:"D", base:"https://tv.dmm.com/vod/?keyword="},');
  lines.push('  duga:   {name:"DUGA",      short:"D", base:"https://duga.jp/search/-/keyword-"},');
  lines.push('  mgs:    {name:"MGS動画",   short:"M", base:"https://www.mgstage.com/search/cSearch.php?search_word="},');
  lines.push('  sod:    {name:"SOD PRIME", short:"S", base:"https://ec.sod.co.jp/prime/videos/?search="},');
  lines.push('  unext:  {name:"U-NEXT",    short:"U", base:"https://video.unext.jp/freeword?query="}');
  lines.push('};');

  // --- filmStreams ---
  lines.push('const filmStreams = {');
  reviews.forEach((r, i) => {
    const id = `vlv${String(i + 1).padStart(2, '0')}`;
    const svcs = (r.services || ['fanza']).map(s => `"${s}"`).join(',');
    lines.push(`  ${id}:[${svcs}]${i < reviews.length - 1 ? ',' : ''}`);
  });
  lines.push('};');

  // --- directLinks ---
  lines.push('// ============ DIRECT LINKS ============');
  lines.push('const directLinks = {');
  reviews.forEach((r, i) => {
    if (r.fanzaUrl) {
      const id = `vlv${String(i + 1).padStart(2, '0')}`;
      lines.push(`  ${id}: "${r.fanzaUrl}"${i < reviews.length - 1 ? ',' : ''}`);
    }
  });
  lines.push('};');
  lines.push('');

  // --- issues ---
  const issues = [
    { id: "all", label: "ALL ISSUES" },
    { id: "2026-05", label: "VOL.05 — 2026年5月" },
    { id: "2026-04", label: "VOL.04 — 2026年4月" },
    { id: "2026-03", label: "VOL.03 — 2026年3月" },
    { id: "2026-02", label: "VOL.02 — 2026年2月" },
    { id: "2026-01", label: "VOL.01 — 2026年1月" }
  ];
  // Collect unique issues from reviews
  const reviewIssues = [...new Set(reviews.map(r => r.issue).filter(Boolean))].sort().reverse();
  reviewIssues.forEach(ri => {
    if (!issues.find(i => i.id === ri)) {
      const [y, m] = ri.split('-');
      const volNum = issues.length;
      issues.splice(1, 0, { id: ri, label: `VOL.${String(volNum).padStart(2, '0')} — ${y}年${parseInt(m)}月` });
    }
  });

  return lines.join('\n');
}

// ============ ビルド実行 ============
const dataSection = generateDataSection(reviews);

// filmIssuesを別途生成
const filmIssuesLines = ['const filmIssues = {'];
reviews.forEach((r, i) => {
  const id = `vlv${String(i + 1).padStart(2, '0')}`;
  const issue = r.issue || '2026-05';
  filmIssuesLines.push(`  ${id}:"${issue}"${i < reviews.length - 1 ? ',' : ''}`);
});
filmIssuesLines.push('};');

let output = template.replace('/*__REVIEWS_DATA__*/', dataSection);
output = output.replace('/*__FILM_ISSUES__*/', filmIssuesLines.join('\n'));

fs.writeFileSync('index.html', output, 'utf8');
console.log(`✅ index.html を生成しました (${reviews.length} 作品)`);
