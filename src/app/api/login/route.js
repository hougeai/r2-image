export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { signToken, buildCookieHeader, getPassword } from '@/lib/auth';

const jsonHeaders = { 'Content-Type': 'application/json' };

export async function POST(request) {
  const { env } = getRequestContext();

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: '请求格式错误' }, { status: 400, headers: jsonHeaders });
  }

  const { password } = body;
  const correctPassword = getPassword(env);
  if (!password || password !== correctPassword) {
    return Response.json({ success: false, message: '密码错误' }, { status: 401, headers: jsonHeaders });
  }

  const token = await signToken(env);
  const res = Response.json({ success: true, message: '登录成功' }, { headers: jsonHeaders });
  res.headers.append('Set-Cookie', buildCookieHeader(token));
  return res;
}
