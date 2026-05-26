/**
 * 画像プロキシ — DMMパッケージ画像をCORS対応で中継する
 * 使い方: /img?url=https://pics.dmm.co.jp/.../xxxpl.jpg
 *
 * html2canvas で外部画像を含む要素を画像化する際、
 * 元画像がCORSヘッダーを返さないと処理が止まる。
 * このプロキシを通すことで Access-Control-Allow-Origin を付与する。
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const target = url.searchParams.get('url');

  // パラメータ未指定
  if (!target) {
    return new Response('missing url parameter', { status: 400 });
  }

  // 許可ドメインのみ中継(安全のため pics.dmm.co.jp 限定)
  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    return new Response('invalid url', { status: 400 });
  }
  if (targetUrl.hostname !== 'pics.dmm.co.jp') {
    return new Response('domain not allowed', { status: 403 });
  }

  // 画像を取得
  try {
    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        'Referer': 'https://www.dmm.co.jp/',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!upstream.ok) {
      return new Response('upstream error', { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (e) {
    return new Response('fetch failed', { status: 502 });
  }
}
