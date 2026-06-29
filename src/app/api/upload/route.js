export const runtime = 'edge';
import { getEnv, isAuthenticated } from '@/lib/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Content-Type': 'application/json'
};

export async function POST(request) {
  const env = await getEnv();

  // 鉴权：配置了 UPLOAD_PASSWORD 时需登录才能上传
  const authed = await isAuthenticated(request, env);
  if (!authed) {
    return Response.json({
      status: 401,
      message: `未登录，请先登录`,
      success: false
    }, {
      status: 401,
      headers: corsHeaders,
    });
  }

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

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return Response.json({
      status: 400,
      message: `file is not found`,
      success: false
    }, {
      status: 400,
      headers: corsHeaders,
    });
  }

  const fileType = file.type;
  const rawName = file.name;

  // 生成唯一文件名：sh-yyyyMMddHHmmss + 3位随机数，避免同名覆盖（如截图都是 image.png）
  const dotIndex = rawName.lastIndexOf('.');
  const ext = dotIndex > 0 ? rawName.slice(dotIndex) : '';
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const filename = `sh-${ts}${rand}${ext}`;

  const header = new Headers();
  header.set("content-type", fileType);
  header.set("content-length", `${file.size}`);

  const fileUrl = `${req_url.origin}/api/rfile/${filename}`;

  try {
    await env.IMGRS.put(filename, file, {
      httpMetadata: header
    });

    // 鉴黄检测：违规图片（rating === 3）拒绝上传并删除
    const rating = await getRating(env, fileUrl);
    if (rating === 3) {
      await env.IMGRS.delete(filename);
      return Response.json({
        status: 403,
        message: `图片内容违规，已拒绝上传`,
        success: false
      }, {
        status: 403,
        headers: corsHeaders,
      });
    }

    return Response.json({
      "url": fileUrl,
      "code": 200,
      "name": filename
    }, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    return Response.json({
      status: 500,
      message: `${error.message}`,
      success: false
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}

// 鉴黄：优先使用 RATINGAPI，其次 ModerateContentApiKey；都未配置返回 0（跳过）
async function getRating(env, url) {
  try {
    const apikey = env.ModerateContentApiKey;
    const ModerateContentUrl = apikey ? `https://api.moderatecontent.com/moderate/?key=${apikey}&` : "";
    const ratingApi = env.RATINGAPI ? `${env.RATINGAPI}?` : ModerateContentUrl;

    if (!ratingApi) {
      return 0;
    }

    const res = await fetch(`${ratingApi}url=${url}`);
    const data = await res.json();
    const rating_index = data.hasOwnProperty('rating_index') ? data.rating_index : -1;
    return rating_index;
  } catch (error) {
    // 鉴黄服务异常时不拦截，避免误杀
    return -1;
  }
}
