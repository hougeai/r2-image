#!/bin/bash
# R2-Image 图床上传脚本
# 用法: ./upload.sh <图片路径>
# 返回: JSON {"url": "...", "code": 200, "name": "..."}

set -euo pipefail

# 代理配置（服务器访问 Cloudflare 必需）
PROXY="-x http://127.0.0.1:8123"

BASE_URL="${R2_IMAGE_BASE_URL:?R2_IMAGE_BASE_URL not set}"
PASSWORD="${R2_IMAGE_PASSWORD:?R2_IMAGE_PASSWORD not set}"
IMAGE_PATH="$1"
COOKIE_FILE="/tmp/r2-image-cookie-$$"

if [ ! -f "$IMAGE_PATH" ]; then
    echo "错误: 文件不存在: $IMAGE_PATH"
    exit 1
fi

# 登录
LOGIN_RESP=$(curl -s --connect-timeout 10 --max-time 15 $PROXY -X POST "$BASE_URL/api/login" \
    -H "Content-Type: application/json" \
    -d "{\"password\":\"$PASSWORD\"}" \
    -c "$COOKIE_FILE" -b "$COOKIE_FILE")

if echo "$LOGIN_RESP" | grep -q '"success":true'; then
    echo "登录成功"
else
    echo "登录失败: $LOGIN_RESP"
    rm -f "$COOKIE_FILE"
    exit 1
fi

# 上传
UPLOAD_RESP=$(curl -s --connect-timeout 10 --max-time 30 $PROXY -X POST "$BASE_URL/api/upload" \
    -b "$COOKIE_FILE" \
    -F "file=@$IMAGE_PATH")

# 清理
rm -f "$COOKIE_FILE"

echo "$UPLOAD_RESP"
