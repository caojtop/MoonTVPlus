// MoonTVPlus 转码接入路由
// 落点：src/app/api/tc/route.ts
//
// 与早前版本的关键修正：
// 1) 本仓库部署用的是 @opennextjs/cloudflare（pnpm build:cloudflare → wrangler deploy），
//    不是 next-on-pages。OpenNext 不支持 Next 的 edge runtime，
//    这里**不能**写 export const runtime = 'edge'，否则构建直接失败。保持默认 nodejs。
// 2) 不再做二次 decodeURIComponent——Next 的 searchParams 已经解码过一次，
//    再解一次会把带 % 的原始 URL 弄坏（源站签名参数尤其容易中招）。
// 3) 只放行 .m3u8。网关输出的是 HLS，放 mp4 会让前端按 mp4 类型解析，必然黑屏。
// 4) 跳转 URL 里把 url 参数放在**最后**，让整条地址以 .m3u8 结尾，
//    这样页面里的 getVideoType() 无论用正则还是 split('.') 都能识别成 m3u8。

import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// 兜底默认值：wrangler 的 [vars] 没注入也能直接工作。
// 要换入口只改这一行，或者在 Cloudflare 面板 / VARS 里覆盖。
const DEFAULT_TRANSCODE_URL = 'https://tc.910168.xyz:8443';

const TRANSCODE_URL = (process.env.TRANSCODE_URL || DEFAULT_TRANSCODE_URL).replace(/\/$/, '');
const PROFILE = process.env.TRANSCODE_PROFILE || '1m';
// 默认开启：只有显式写成 false 才关闭，避免变量没注入时静默失效
const ENABLED = (process.env.ENABLE_TRANSCODE || 'true') !== 'false';
const TOKEN = process.env.TRANSCODE_TOKEN || '';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store',
    },
  });
}

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get('url') || req.nextUrl.searchParams.get('u') || '';
  if (!source) return json({ error: 'missing url' }, 400);

  const q = req.nextUrl.searchParams.get('q') || PROFILE;

  // 未开启或配置缺失：原样跳回，行为与改动前一致
  if (!ENABLED || !TRANSCODE_URL || !/^https?:\/\//i.test(source)) {
    return Response.redirect(source, 302);
  }
  if (source.startsWith(TRANSCODE_URL)) return Response.redirect(source, 302);
  if (!/\.m3u8(\?|#|$)/i.test(source)) return Response.redirect(source, 302);

  let target = `${TRANSCODE_URL}/play?q=${encodeURIComponent(q)}`;
  // 起转位置（秒）：有就透传给网关，网关用 -ss 定位，不必从 0 秒转到这里
  const t0 = Math.max(0, parseInt(req.nextUrl.searchParams.get('t0') || '0', 10) || 0);
  if (t0 > 0) target += `&t0=${t0}`;
  target += `&u=${encodeURIComponent(source)}`;
  if (TOKEN) target += `&t=${encodeURIComponent(TOKEN)}`;

  return new Response(null, {
    status: 302,
    headers: {
      location: target,
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': '*',
    },
  });
}
