export const COOKIE_NAME = 'img_auth';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365天，单位秒
const DEFAULT_PASSWORD = 'pw'; // 未配置 UPLOAD_PASSWORD 时使用的默认密码

// 获取上传密码：未配置则用默认密码 pw
export function getPassword(env) {
  return env.UPLOAD_PASSWORD || DEFAULT_PASSWORD;
}

function getSecret(env) {
  return env.AUTH_SECRET || getPassword(env);
}

async function importKey(secret) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bufToB64(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function b64ToBuf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// 签发 token：base64(payload).base64(hmac签名)
export async function signToken(env) {
  const key = await importKey(getSecret(env));
  const payload = JSON.stringify({ exp: Date.now() + COOKIE_MAX_AGE * 1000 });
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return btoa(payload) + '.' + bufToB64(sig);
}

// 验证 token
export async function verifyToken(token, env) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sigB64] = parts;
  try {
    const key = await importKey(getSecret(env));
    const sig = b64ToBuf(sigB64);
    const payload = atob(payloadB64);
    const enc = new TextEncoder();
    const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(payload));
    if (!valid) return false;
    const data = JSON.parse(payload);
    if (data.exp && Date.now() > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const idx = c.indexOf('=');
    if (idx > -1) {
      cookies[c.slice(0, idx).trim()] = c.slice(idx + 1).trim();
    }
  });
  return cookies;
}

// 是否需要鉴权（始终需要，未配密码则用默认密码 pw）
export function requireAuth() {
  return true;
}

// 当前请求是否已登录
export async function isAuthenticated(request, env) {
  if (!requireAuth(env)) return true;
  const cookies = parseCookies(request.headers.get('cookie'));
  return verifyToken(cookies[COOKIE_NAME], env);
}

export function buildCookieHeader(value, maxAge) {
  const max = maxAge ?? COOKIE_MAX_AGE;
  return `${COOKIE_NAME}=${value}; HttpOnly; Path=/; Max-Age=${max}; SameSite=Lax`;
}

export { COOKIE_MAX_AGE };
