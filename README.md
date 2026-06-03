# 吃瓜大师 🍉

夏日必备！通过麦克风检测拍西瓜声音、摄像头分析西瓜成色，判断其成熟度，并支持趣味给瓜打分与晒瓜广场分享。

## 功能特性

- 🎤 **音频检测**：通过麦克风检测拍西瓜声音，分析频率判断成熟度
- 📷 **视觉分析**：使用摄像头拍摄西瓜，分析条纹和颜色
- 📊 **智能评分**：基于声学和视觉特征的综合评分系统
- 🏆 **社区广场**：分享你的西瓜测评，查看其他用户的分享
- 🛡️ **内容过滤**：智能敏感词过滤，营造和谐社区氛围

## 技术栈

- **前端**：React 19 + TypeScript + Tailwind CSS + Vite
- **后端**：Express.js + SQLite (better-sqlite3)
- **部署**：Docker + Nginx 反向代理

## 快速开始

### 本地开发

**前置要求：** Node.js 18+

1. 安装依赖：
   ```bash
   npm install
   ```

2. 配置环境变量（可选）：
   ```bash
   cp .env.example .env.local
   # 编辑 .env.local 文件，配置你的 API Key（如果需要）
   ```

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

4. 访问应用：http://localhost:3000/chigua/

### 生产部署

#### 方式一：使用 Docker Compose（推荐）

1. 构建并启动服务：
   ```bash
   docker-compose up -d
   ```

2. 访问应用：http://localhost:3000/chigua/

3. 查看日志：
   ```bash
   docker-compose logs -f
   ```

#### 方式二：手动构建

1. 构建前端：
   ```bash
   npm run build
   ```

2. 启动服务器：
   ```bash
   npm start
   ```

3. 访问应用：http://localhost:3000/chigua/

## API 接口

### 健康检查
```
GET /chigua-api/health
```

### 获取记录列表
```
GET /chigua-api/records?limit=100&offset=0
```

### 获取热门记录
```
GET /chigua-api/records/popular?limit=20
```

### 获取单条记录
```
GET /chigua-api/records/:id
```

### 创建记录
```
POST /chigua-api/records
Content-Type: application/json

{
  "id": "melon-1234567890",
  "name": "超级甜的大西瓜",
  "soundScore": 95,
  "lookScore": 88,
  "overallScore": 92,
  "frequency": 125,
  "stripeContrast": 0.85,
  "greenness": 0.7,
  "ripenessStatus": "ripe",
  "ratedStars": 5,
  "message": "这个西瓜太好吃了！",
  "timestamp": 1234567890,
  "photoUrl": "data:image/png;base64,...",
  "likes": 0,
  "location": "📍 北京大兴庞各庄",
  "mood": "❤️ 元气脆甜心情"
}
```

### 点赞记录
```
POST /chigua-api/records/:id/like
```

### 删除记录
```
DELETE /chigua-api/records/:id
```

## Nginx 配置

参考 `nginx/nginx-chigua.conf` 文件，将 `/chigua` 和 `/chigua-api` 路径反向代理到后端服务。

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务器端口 | 3000 |
| NODE_ENV | 运行环境 | development |
| DATABASE_PATH | SQLite 数据库路径 | ./data/chigua.db |
| GEMINI_API_KEY | Gemini API Key（可选） | - |

## 部署到私有仓库

```bash
# 使用部署脚本
./deploy_update.sh
```

## 项目结构

```
chigua/
├── src/
│   ├── App.tsx              # 主应用组件
│   ├── main.tsx             # 入口文件
│   ├── index.css            # 全局样式
│   ├── types.ts             # TypeScript 类型定义
│   ├── components/          # React 组件
│   │   ├── SquareFeed.tsx   # 社区广场组件
│   │   └── WaveformVisualizer.tsx  # 波形可视化组件
│   ├── utils/               # 工具函数
│   │   ├── audioSynth.ts    # 音频合成
│   │   ├── filter.ts        # 敏感词过滤
│   │   └── watermelonDrawer.ts  # 西瓜绘制
│   └── services/            # 服务层
│       └── dbService.js     # SQLite 数据库服务
├── server.js                # Express 服务器
├── Dockerfile               # Docker 镜像构建
├── docker-compose.yml       # Docker Compose 配置
├── deploy_update.sh         # 部署脚本
├── nginx/                   # Nginx 配置
│   └── nginx-chigua.conf
├── .env.example             # 环境变量示例
├── .env.local               # 本地环境变量（不提交）
├── package.json             # 项目依赖
├── vite.config.ts           # Vite 配置
└── tsconfig.json            # TypeScript 配置
```

## 许可证

MIT
