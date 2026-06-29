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

// 删除文件（支持单个或批量）
// DELETE /api/delete  body: { "names": ["xxx.png", "yyy.jpg"] }
export async function DELETE(request) {
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

  let names;
  try {
    const body = await request.json();
    names = body.names;
  } catch {
    return Response.json({
      status: 400,
      message: `请求体格式错误，应为 JSON: {"names": ["xxx.png"]}`,
      success: false
    }, { status: 400, headers: corsHeaders });
  }

  if (!Array.isArray(names) || names.length === 0) {
    return Response.json({
      status: 400,
      message: `names 为空或格式不正确`,
      success: false
    }, { status: 400, headers: corsHeaders });
  }

  // 逐个删除并收集结果
  const results = [];
  let failCount = 0;
  for (const name of names) {
    if (typeof name !== 'string' || !name.trim()) {
      results.push({ name, ok: false, message: '无效文件名' });
      failCount++;
      continue;
    }
    try {
      await env.IMGRS.delete(name);
      results.push({ name, ok: true });
    } catch (error) {
      results.push({ name, ok: false, message: error.message });
      failCount++;
    }
  }

  return Response.json({
    success: failCount === 0,
    deleted: results.filter(r => r.ok).length,
    failed: failCount,
    results,
  }, { status: 200, headers: corsHeaders });
}
