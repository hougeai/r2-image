export const runtime = 'edge';
import { getEnv, isAuthenticated } from '@/lib/auth';

export async function GET(request) {
  const env = await getEnv();

  // 始终需要登录（未配 UPLOAD_PASSWORD 时使用默认密码 pw）
  const authed = await isAuthenticated(request, env);
  return Response.json({ requireAuth: true, authenticated: authed });
}
