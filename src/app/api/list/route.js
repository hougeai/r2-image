export const runtime = 'edge';
import { getEnv, isAuthenticated } from '@/lib/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

// 列出 R2 中所有文件，支持游标分页
// GET /api/list?cursor=xxx&limit=100
export async function GET(request) {
  const env = await getEnv();

  const authed = await isAuthenticated(request, env);
  if (!authed) {
    return Response.json({
      status: 401,
      message: `未登录，请先登录`,
      success: false
    }, { status: 401, headers: corsHeaders });
  }

  if (!env.IMGRS) {
    return Response.json({
      status: 500,
      message: `IMGRS is not Set`,
      success: false
    }, { status: 500, headers: corsHeaders });
  }

  const req_url = new URL(request.url);
  const cursor = req_url.searchParams.get('cursor') || undefined;
  const limit = Math.min(parseInt(req_url.searchParams.get('limit') || '100', 10), 1000);

  try {
    const listed = await env.IMGRS.list({ cursor, limit });

    const objects = listed.objects.map(obj => ({
      name: obj.key,
      size: obj.size,
      uploaded: obj.uploaded instanceof Date ? obj.uploaded.toISOString() : obj.uploaded,
    }));

    return Response.json({
      objects,
      truncated: listed.truncated,
      cursor: listed.truncated ? listed.cursor : null,
      success: true
    }, { status: 200, headers: corsHeaders });
  } catch (error) {
    return Response.json({
      status: 500,
      message: `${error.message}`,
      success: false
    }, { status: 500, headers: corsHeaders });
  }
}
