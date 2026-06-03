# 使用Node.js LTS版本作为基础镜像
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖（包括devDependencies用于构建）
RUN npm ci

# 复制所有源代码
COPY . .

# 前端构建时需要的环境变量（VITE_ 前缀，通过 build-arg 传入）
ARG VITE_SHARED_SECRET=""
ENV VITE_SHARED_SECRET=$VITE_SHARED_SECRET

# 构建前端应用
RUN npm run build

# 生产阶段
FROM node:20-alpine AS production

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 仅安装生产依赖（不包括devDependencies）
RUN npm ci --only=production

# 从构建阶段复制构建好的前端文件
COPY --from=builder /app/dist ./dist

# 复制服务器源代码和必要的服务文件
COPY server.js ./
COPY src/services/ ./src/services/

# 创建数据目录 /data/chigua 用于挂载SQLite数据库
RUN mkdir -p /data/chigua && chmod 777 /data/chigua

# 创建非root用户运行应用（安全最佳实践）
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# 暴露端口（与server.js中的PORT环境变量一致）
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/chigua/chigua.db

# 启动应用
CMD ["node", "server.js"]
