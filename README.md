# r2-image

> 基于 Cloudflare Pages + Cloudflare R2 对象存储的图床，仅保留上传图片并获取 URL 的核心功能，支持上传密码鉴权与可选的内容审查。

## 效果预览

| 登录页 | 上传页 |
| ----------- | ----------- |
| ![登录页](./docs/img/preview-login.png) | ![上传页](./docs/img/preview-upload.png) |

---

## 优点

1. 无限图片储存数量，你可以上传不限数量的图片

2. 无需购买服务器，托管于 Cloudflare 的网络上，当使用量不超过 Cloudflare 的免费额度时，完全免费

3. 无需购买域名，可以使用 Cloudflare Pages 提供的 `*.pages.dev` 的免费二级域名，同时也支持绑定自定义域名

4. 图片直接存储在 Cloudflare R2 对象存储中，访问稳定可控

5. 支持上传密码鉴权，防止他人上传；可选内容审查，拦截违规图片


## 利用 Cloudflare Pages 部署

1. 点击 [Fork](https://github.com/hougeai/r2-image/fork) 按钮将 [hougeai/r2-image](https://github.com/hougeai/r2-image) 复制到你自己的账号下。

2. 登录到 [Cloudflare](https://dash.cloudflare.com/) 控制台。

3. 在帐户主页中，选择 `pages` > `Create a project` > `Connect to Git`。

   ![创建 Pages 项目](./docs/img/deploy-pages.png)

4. 选择你 fork 的项目存储库，在 `Set up builds and deployments` 部分中，`Framework preset(框架)` 选 `Next.js` 即可。
    ![配置 Pages 项目](./docs/img/nextjsimages1.png)

5. 点击 `Save and Deploy` 部署。

6. 设置兼容性标志：前往后台依次点击 `设置` -> `运行时` -> `兼容性标志` -> `配置生产兼容性标志`，填写 `nodejs_compat`。

   ![兼容性标志](./docs/img/deploy-compat.png)

7. 绑定 R2 存储桶（见下方 [配置 R2 对象存储](#配置-r2-对象存储)）。

8. 配置环境变量（见下方 [配置上传登录密码](#配置上传登录密码推荐防止他人上传) 与 [配置鉴黄 API](#配置鉴黄-api可选防止上传违规图片)）。

9.  前往后台点击 `部署`，或者找到最新的一次部署点 `重试部署`（绑定 R2、兼容性标志、环境变量后需重新部署才能生效）。


## 配置 R2 对象存储

1. 在 Cloudflare 控制台创建一个 R2 存储桶（例如 `img`）。

2. 进入你的 Pages 项目，前往后台依次点击 `设置` -> `绑定` -> `添加`。

3. `变量名称` 填写 `IMGRS`，`R2 存储桶` 选择你刚才创建的存储桶，保存。

> 代码中通过 `env.IMGRS` 访问 R2 桶，因此变量名称必须为 `IMGRS`，否则上传/读取会报 `IMGRS is not Set`。

  ![R2 绑定](./docs/img/deploy-r2-bind.png)

## 配置上传登录密码（推荐，防止他人上传）

在 Cloudflare Pages 项目 `设置` -> `环境变量` 中配置：

| 变量名称 | 值 | 说明 |
| ----------- | ----------- | ----------- |
| `UPLOAD_PASSWORD` | 你的密码 | 上传密码，未配置时使用默认密码 `pw`；建议部署后修改为自己的密码 |
| `AUTH_SECRET` | 随机字符串 | 可选，用于签名登录 token，不配则用 `UPLOAD_PASSWORD` 派生 |

> 登录态通过 httpOnly cookie 缓存在浏览器，有效期 365 天，同一浏览器下次打开无需重新登录。已上传图片的 URL 仍保持公开可访问（否则图片无法展示）。

## 配置鉴黄 API（可选，防止上传违规图片）

在 Cloudflare Pages 项目 `设置` -> `环境变量` 中配置以下任一变量即可开启图片内容审查，违规图片（rating 为 3）会在上传时被自动拒绝并从 R2 删除：

| 变量名称 | 值 | 说明 |
| ----------- | ----------- | ----------- |
| `ModerateContentApiKey` | 你的 API key | 注册地址 [https://moderatecontent.com/](https://moderatecontent.com/)，免费 |
| `RATINGAPI` | `https://你的域名/rating` | 自建鉴黄 API（部署见下方） |

> 优先级：`RATINGAPI` > `ModerateContentApiKey`。两者都未配置时跳过鉴黄直接上传；鉴黄服务异常时也不拦截，避免误杀。


### 自建鉴黄 API（nsfwjs-api）

[nswfjs-api](https://github.com/x-dr/nsfwjs-api) 基于 TensorFlow + NSFWJS，可自建部署。⚠️ **注意：由于依赖 `@tensorflow/tfjs-node`（原生 C++ 模块），打包后约 111.7MB，无法部署到 Cloudflare Workers（不支持原生模块/体积限制）和 Vercel（Serverless 函数上限 50MB）。推荐用 Docker 部署到自有服务器或免费容器平台。**

#### 方式一：Docker 部署（推荐）

```bash
# 1. 拉取镜像
docker pull gindex/nsfwjs-api:latest

# 2. 运行容器（端口 3035）
docker run -itd \
  --name nsfwjs \
  -p 3035:3035 \
  --restart=always \
  gindex/nsfwjs-api:latest

# 3. 访问 http://你的IP:3035/ 测试是否启动
```

部署好后，在 Cloudflare Pages 配置环境变量：
- `RATINGAPI` = `http://你的IP:3035`

> 免费方案对比（均能跑，但都有**休眠机制**，可靠性不及自有 VPS）：
>
> | 平台 | 免费额度 | 休眠机制 | 说明 |
> | ----------- | ----------- | ----------- | ----------- |
> | [Hugging Face Spaces](https://huggingface.co/spaces) | 永久免费 CPU Basic（2vCPU/16GB/50GB） | 长时间无人访问会休眠 | 支持 Docker，免费额度最大方 |
> | [Render](https://render.com/) | 每月 750 小时免费实例 | 15 分钟无流量休眠，重启约 1 分钟 | 仅适合测试/业余项目，非"永久无限" |
>
> ⚠️ **休眠机制对鉴黄的影响**：图床非高频访问，鉴黄 API 易长时间空闲而休眠。此时用户上传图片会触发鉴黄 API 冷启动（约 1 分钟），上传可能超时；而本图床"鉴黄服务异常不拦截"的逻辑会导致休眠期间上传的违规图片漏过。**对鉴黄可靠性有要求请用自有 VPS（Docker 常驻）。**
>
> 此外，鉴黄 API 需通过 URL 拉取图片，所以部署位置必须能被图床从公网访问（不能是纯内网）。

#### 方式二：源码部署

```bash
# 需要 Node.js 20.x
git clone https://github.com/x-dr/nsfw-api.git
cd nsfw-api
npm install
npm rebuild @tensorflow/tfjs-node --build-from-source
npm run start
# 访问 http://你的IP:3035/
```

#### API 返回示例

```json
{
  "Neutral": 0.985,
  "Drawing": 0.007,
  "Porn": 0.004,
  "Hentai": 0.002,
  "Sexy": 0.0001,
  "url": "图片地址",
  "status": 200,
  "rating": 1
}
```

`rating` 字段：`1`=无害 / `2`=性感 / `3`=色情（图床仅对 `3` 拦截）。


## 接口说明

| 路径 | 方法 | 说明 |
| ----------- | ----------- | ----------- |
| `/api/upload` | POST | 上传图片/文件，返回 JSON，其中 `url` 为访问地址（配置 `UPLOAD_PASSWORD` 后需登录） |
| `/api/rfile/{filename}` | GET | 通过文件名访问 R2 中的文件（带边缘缓存，公开访问） |
| `/api/login` | POST | 登录，body: `{"password":"密码"}`，成功写入登录 cookie |
| `/api/logout` | POST | 登出，清除登录 cookie |
| `/api/auth/check` | GET | 检查登录态，返回 `{requireAuth, authenticated}` |

上传成功返回示例：

```json
{
  "url": "https://你的域名/api/rfile/xxx.png",
  "code": 200,
  "name": "xxx.png"
}
```


## AI 助手技能（Skills）

项目根目录下的 [`skills/`](./skills) 文件夹内置了 AI Agent 技能包，无需额外编写——直接交给 AI 编程工具加载即可使用。集成后，你只需用自然语言对 AI 说"把这张图片上传到图床"，Agent 就会自动调用技能完成上传并返回 URL。

### 如何使用

1. **加载技能**：将本项目的 [`skills/`](./skills) 目录接入你的 AI 编程工具即可，各工具会自行识别并按其中的 `SKILL.md` 指令执行。

2. **配置环境变量**（AI Agent 运行时需要读取）：

| 变量 | 说明 |
|------|------|
| `R2_IMAGE_BASE_URL` | 图床域名，如 `https://xxx.pages.dev` |
| `R2_IMAGE_PASSWORD` | 上传密码（即 Cloudflare Pages 中配置的 `UPLOAD_PASSWORD`） |

```bash
export R2_IMAGE_BASE_URL="https://your-site.pages.dev"
export R2_IMAGE_PASSWORD="your-password"
```

3. **开始使用**：在 AI 编程工具中直接说，例如：
   - "把 `./screenshot.png` 上传到图床"
   - "上传这张图片并给出访问链接"

Agent 会自动登录图床、上传图片，返回形如 `https://你的域名/api/rfile/xxx.png` 的公开访问 URL。


## 致谢

本项目基于 [x-dr/telegraph-Image](https://github.com/x-dr/telegraph-Image) 改造，精简为仅使用 Cloudflare R2 对象存储的图床，感谢原作者的开源贡献。
