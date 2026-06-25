export const runtime = 'edge';
import { buildCookieHeader } from '@/lib/auth';

const jsonHeaders = { 'Content-Type': 'application/json' };

export async function POST() {
  const res = Response.json({ success: true, message: '已登出' }, { headers: jsonHeaders });
  // 清除 cookie：值为空 + Max-Age=0 立即过期
  res.headers.append('Set-Cookie', buildCookieHeader('', 0));
  return res;
}
