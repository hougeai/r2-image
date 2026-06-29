export const runtime = 'edge';

export async function GET(request) {
  // 获取客户端的IP地址（Edge runtime 下不存在 request.socket）
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip');
  const clientIp = ip ? ip.split(',')[0].trim() : 'IP not found';

  return new Response(
    JSON.stringify({ ip: clientIp }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }
  );
}
