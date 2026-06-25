export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request) {
  const { env } = getRequestContext();

  // 始终需要登录（未配 UPLOAD_PASSWORD 时使用默认密码 pw）
  const authed = await isAuthenticated(request, env);
  return Response.json({ requireAuth: true, authenticated: authed });
}
