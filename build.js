/**
 * VELVET&PRESS ビルドスクリプト v3
 * - パッケージ画像表示対応
 * - JSON検証強化
 * - sitemap.xml 自動生成
 */

const fs = require('fs');

const SITE_URL = 'https://inspiring-ganache-e1eca4.netlify.app';

// ============ JSON検証 ============
function validateReviews(reviews) {
  const errors = [];

  if (!Array.isArray(reviews)) {
    errors.push('❌ reviews.json はJSON配列でなければなりません');
    return errors;
  }
  if (reviews.length === 0) {
    errors.push('❌ レビューが1件もありません');
    return errors;
  }

  const requiredFields = ['code', 'title', 'actress', 'studio', 'year', 'runtime', 'score', 'verdict', 'genre', 'lead', 'body1', 'body2', 'tags', 'fanzaUrl', 'packageImage'];
  const validGenres = ['単体', '企画', 'ドラマ', 'ロマンス', 'シチュエーション'];

  reviews.forEach((r, i) => {
    const prefix = `❌ 作品 #${i + 1} (${r.code || 'コード未設定'}):`;

    requiredFields.forEach(field => {
      if (r[field] === undefined || r[field] === null || r[field] === '') {
        errors.push(`${prefix} "${field}" が未設定です`);
      }
    });

    if (typeof r.score === 'number') {
      if (r.score < 0 || r.score > 100) {
        errors.push(`${prefix} スコアは 0〜100 の範囲で指定してください (現在: ${r.score})`);
      }
    } else if (r.score !== undefined) {
      errors.push(`${prefix} スコアは数値で指定してください`);
    }

    if (r.year !== undefined && typeof r.year !== 'number') {
      errors.push(`${prefix} year は数値で指定してください`);
    }
    if (r.runtime !== undefined && typeof r.runtime !== 'number') {
      errors.push(`${prefix} runtime は数値で指定してください`);
    }

    if (Array.isArray(r.genre)) {
      r.genre.forEach(g => {
        if (!validGenres.includes(g)) {
          errors.push(`${prefix} ジャンル "${g}" は無効です。有効: ${validGenres.join(', ')}`);
        }
      });
    } else if (r.genre !== undefined) {
      errors.push(`${prefix} genre は配列で指定してください`);
    }

    if (r.tags !== undefined && !Array.isArray(r.tags)) {
      errors.push(`${prefix} tags は配列で指定してください`);
    }

    if (r.fanzaUrl && !r.fanzaUrl.startsWith('https://')) {
      errors.push(`${prefix} fanzaUrl は https:// で始まる必要があります`);
    }

    if (r.packageImage && !r.packageImage.startsWith('https://')) {
      errors.push(`${prefix} packageImage は https:// で始まる必要があります`);
    }

    if (r.verdict && r.verdict.length > 50) {
      errors.push(`⚠️ ${prefix.replace('❌', '')} verdict が長すぎます (推奨: 20〜40文字、現在: ${r.verdict.length}文字)`);
    }
  });

  const codes = reviews.map(r => r.code);
  const duplicates = codes.filter((c, i) => codes.indexOf(c) !== i);
  if (duplicates.length > 0) {
    errors.push(`❌ 重複した品番があります: ${[...new Set(duplicates)].join(', ')}`);
  }

  return errors;
}

// ============ ファイル読み込み ============
let reviews, template;
try {
  reviews = JSON.parse(fs.readFileSync('reviews.json', 'utf8'));
} catch (e) {
  console.error('❌ reviews.json の読み込みに失敗しました');
  console.error('   詳細:', e.message);
  console.error('💡 https://jsonlint.com/ で記述ミスを確認できます');
  process.exit(1);
}

try {
  template = fs.readFileSync('template.html', 'utf8');
} catch (e) {
  console.error('❌ template.html が見つかりません');
  process.exit(1);
}

// ============ 検証実行 ============
console.log('🔍 reviews.json を検証中...');
const validationErrors = validateReviews(reviews);
if (validationErrors.length > 0) {
  console.error('\n===== 検証エラー =====');
  validationErrors.forEach(err => console.error(err));
  console.error(`\n合計 ${validationErrors.length} 件のエラー`);
  console.error('修正後、再度コミットしてください');
  process.exit(1);
}
console.log(`✅ 検証OK (${reviews.length} 作品)`);

// ============ データ生成 ============
function generateDataSection(reviews) {
  const lines = [];
  const escape = (s) => (s || '').toString().replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  lines.push('// ============ FILM DATA (auto-generated) ============');
  lines.push('const films = [');
  reviews.forEach((r, i) => {
    const id = `vlv${String(i + 1).padStart(2, '0')}`;
    const genreStr = r.genre.map(g => `"${escape(g)}"`).join(',');
    const tagsStr = (r.tags || []).map(t => `"${escape(t)}"`).join(',');
    const bodyStr = `["${escape(r.body1)}","${escape(r.body2)}"]`;

    let line = `  {id:"${id}", code:"${escape(r.code)}", title:"${escape(r.title)}", orig:"${escape(r.code)}", actress:"${escape(r.actress)}", director:"${escape(r.studio)}", studio:"${escape(r.studio)}", year:${r.year}, runtime:${r.runtime}, score:${r.score}, verdict:"${escape(r.verdict)}", genre:[${genreStr}],`;
    line += `\n    lead:"${escape(r.lead)}",`;
    line += `\n    body:${bodyStr},`;
    line += `\n    tags:[${tagsStr}],`;
    line += `\n    packageImage:"${escape(r.packageImage)}"`;
    line += `}${i < reviews.length - 1 ? ',' : ''}`;
    lines.push(line);
  });
  lines.push('];');
  lines.push('');

  // posterMarkupは画像表示のため不要だが、互換性のため空オブジェクトを置く
  lines.push('const posterMarkup = {};');
  lines.push('');

  lines.push('const services = {');
  lines.push('  fanza:  {name:"FANZA",     short:"F", base:"https://www.dmm.co.jp/search/=/searchstr="},');
  lines.push('  dmm:    {name:"DMM TV",    short:"D", base:"https://tv.dmm.com/vod/?keyword="},');
  lines.push('  duga:   {name:"DUGA",      short:"D", base:"https://duga.jp/search/-/keyword-"},');
  lines.push('  mgs:    {name:"MGS動画",   short:"M", base:"https://www.mgstage.com/search/cSearch.php?search_word="},');
  lines.push('  sod:    {name:"SOD PRIME", short:"S", base:"https://ec.sod.co.jp/prime/videos/?search="},');
  lines.push('  unext:  {name:"U-NEXT",    short:"U", base:"https://video.unext.jp/freeword?query="}');
  lines.push('};');

  lines.push('const filmStreams = {');
  reviews.forEach((r, i) => {
    const id = `vlv${String(i + 1).padStart(2, '0')}`;
    const svcs = (r.services || ['fanza']).map(s => `"${s}"`).join(',');
    lines.push(`  ${id}:[${svcs}]${i < reviews.length - 1 ? ',' : ''}`);
  });
  lines.push('};');

  lines.push('const directLinks = {');
  const directLinkEntries = reviews.filter(r => r.fanzaUrl);
  directLinkEntries.forEach((r, i) => {
    const idx = reviews.indexOf(r);
    const id = `vlv${String(idx + 1).padStart(2, '0')}`;
    lines.push(`  ${id}: "${r.fanzaUrl}"${i < directLinkEntries.length - 1 ? ',' : ''}`);
  });
  lines.push('};');

  return lines.join('\n');
}

// ============ sitemap ============
function generateSitemap(reviews) {
  const today = new Date().toISOString().split('T')[0];
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${SITE_URL}/about.html`, priority: '0.5', changefreq: 'monthly' },
    { loc: `${SITE_URL}/privacy.html`, priority: '0.3', changefreq: 'yearly' }
  ];
  reviews.forEach((r, i) => {
    const id = `vlv${String(i + 1).padStart(2, '0')}`;
    urls.push({ loc: `${SITE_URL}/#/work/${id}`, priority: '0.7', changefreq: 'monthly' });
  });

  const xml = ['<?xml version="1.0" encoding="UTF-8"?>'];
  xml.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  urls.forEach(u => {
    xml.push('  <url>');
    xml.push(`    <loc>${u.loc}</loc>`);
    xml.push(`    <lastmod>${today}</lastmod>`);
    xml.push(`    <changefreq>${u.changefreq}</changefreq>`);
    xml.push(`    <priority>${u.priority}</priority>`);
    xml.push('  </url>');
  });
  xml.push('</urlset>');
  return xml.join('\n');
}

// ============ ビルド ============
const dataSection = generateDataSection(reviews);

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

const sitemap = generateSitemap(reviews);
fs.writeFileSync('sitemap.xml', sitemap, 'utf8');
console.log(`✅ sitemap.xml を生成しました`);

console.log('\n🎉 ビルド完了!');
