#!/bin/bash

# 吃瓜大师部署脚本
# 用于构建和推送 Docker 镜像到私有仓库

set -e

# 配置变量
IMAGE_NAME="chigua"
REGISTRY="zzxun.cn:5000"
TAG="latest"

echo "🍉 开始部署吃瓜大师..."

# 构建 Docker 镜像
echo "📦 构建 Docker 镜像..."
docker build -t ${IMAGE_NAME}:${TAG} .

# 打标签
echo "🏷️ 打标签..."
docker tag ${IMAGE_NAME}:${TAG} ${REGISTRY}/${IMAGE_NAME}:${TAG}

# 推送到私有仓库
echo "📤 推送到私有仓库..."
docker push ${REGISTRY}/${IMAGE_NAME}:${TAG}

echo "✅ 部署完成！"
echo "镜像地址: ${REGISTRY}/${IMAGE_NAME}:${TAG}"
