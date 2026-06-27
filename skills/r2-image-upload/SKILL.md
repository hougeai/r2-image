---
name: r2-image-upload
description: 上传图片到 Cloudflare R2 图床，返回公开访问 URL。
---

# R2-Image 图床上传技能

将本地图片上传到部署在 Cloudflare Pages 上的 r2-image 图床，返回可公开访问的 URL。

## 前置配置

以下环境变量必须已设置，否则无法使用：

| 变量 | 说明 |
|------|------|
| `R2_IMAGE_BASE_URL` | 图床域名，如 `https://xxx.pages.dev` |
| `R2_IMAGE_PASSWORD` | 上传密码 |

使用前请确认：

```bash
echo $R2_IMAGE_BASE_URL   # 应有输出
echo $R2_IMAGE_PASSWORD   # 应有输出
```

若未设置，先配置：

```bash
export R2_IMAGE_BASE_URL="https://your-site.pages.dev"
export R2_IMAGE_PASSWORD="your-password"
```

## 工作流程

### 一键上传（推荐）

```bash
bash "$HERMES_SKILL_DIR/scripts/upload.sh" /path/to/image.png
```

**示例**：上传当前目录下的 `screenshot.png`

```bash
bash "$HERMES_SKILL_DIR/scripts/upload.sh" ./screenshot.png
```

返回 JSON：

```json
{
  "url": "https://你的域名/api/rfile/sh-20260625120000abc.png",
  "code": 200,
  "name": "sh-20260625120000abc.png"
}
```

### 手动分步（cookie 路径可自定义，脚本自动管理）

#### Step 1: 登录获取 Cookie

```bash
curl -s -X POST "$R2_IMAGE_BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"password":"'"$R2_IMAGE_PASSWORD"'"}' \
  -c /tmp/r2-image-cookie.txt -b /tmp/r2-image-cookie.txt
```

成功返回：`{"success":true,"message":"登录成功"}`

#### Step 2: 上传图片

```bash
curl -s -X POST "$R2_IMAGE_BASE_URL/api/upload" \
  -b /tmp/r2-image-cookie.txt \
  -F "file=@/path/to/image.png"
```

#### Step 3: 清理 Cookie

```bash
rm -f /tmp/r2-image-cookie.txt
```

## 注意事项

- Cookie 有效期 365 天，不需要每次上传都重新登录。复用同一个 cookie 文件即可。
- 文件名由服务端自动生成：`sh-yyyyMMddHHmmss` + 3位随机数 + 原扩展名，不会覆盖。
- 图片访问 URL 格式: `$R2_IMAGE_BASE_URL/api/rfile/{filename}`
- 鉴黄功能：如果配置了 ModerateContentApiKey 或 RATINGAPI，违规图片会被自动拒绝。
- 如果登录超时，检查图床域名是否能从本机访问（Cloudflare Pages 可能有区域限制）。

## 错误处理

| 错误 | 原因 | 解决 |
|------|------|------|
| `{"success":false,"message":"密码错误"}` | 密码不对 | 检查 R2_IMAGE_PASSWORD |
| `{"status":401,"message":"未登录，请先登录"}` | Cookie 过期或未登录 | 重新执行 Step 1 |
| `{"status":400,"message":"file is not found"}` | 文件路径不存在 | 检查图片路径 |
| `{"status":400,"message":"图片内容违规"}` | 鉴黄拦截（rating=3） | 更换合规图片 |
| Connection timeout | 图床域名从本机不可达 | 检查网络/Cloudflare 区域限制 |
