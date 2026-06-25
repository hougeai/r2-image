export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Content-Type': 'application/json'
};

export async function OPTIONS() {
  return new Response(null, {
    headers: corsHeaders
  });
}

//https://developers.cloudflare.com/r2/examples/demo-worker/
export async function GET(request, { params }) {
  const { name } = params;
  const { env, ctx } = getRequestContext();

  if (!env.IMGRS) {
    return Response.json({
      status: 500,
      message: `IMGRS is not Set`,
      success: false
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }

  const req_url = new URL(request.url);
  // 构造缓存键
  const cacheKey = new Request(req_url.toString(), request);
  const cache = caches.default;

  // 检查缓存
  let cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    // 如果缓存中存在，直接返回缓存响应
    return cachedResponse;
  }

  try {
    const object = await env.IMGRS.get(name, {
      range: request.headers,
      onlyIf: request.headers,
    });

    if (object === null) {
      return Response.json({
        status: 404,
        message: `not found`,
        success: false
      }, {
        status: 404,
        headers: corsHeaders,
      });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    if (object.range) {
      headers.set("content-range", `bytes ${object.range.offset}-${object.range.end ?? object.size - 1}/${object.size}`);
    }

    const status = object.body ? (request.headers.get("range") !== null ? 206 : 200) : 304;

    let response_img = new Response(object.body, {
      headers,
      status
    });

    if (status === 200) {
      ctx.waitUntil(cache.put(cacheKey, response_img.clone()));
    }

    return response_img;
  } catch (error) {
    return Response.json({
      status: 500,
      message: ` ${error.message}`,
      success: false
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
