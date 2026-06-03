import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  saveRecord,
  getAllRecords,
  getRecordById,
  likeRecord,
  deleteRecord,
  getRecordCount,
  getPopularRecords
} from './src/services/dbService.js';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3000;

// 获取 __dirname 的等效值（ES模块）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 允许较大的 base64 图片数据

// API 路由（使用 /chigua-api 前缀）

// 健康检查
app.get('/chigua-api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '吃瓜大师服务器运行正常',
    timestamp: new Date().toISOString()
  });
});

// 内容审核（对接 DeepSeek API）
app.post('/chigua-api/moderate', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: '请提供需要审核的文本内容' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === 'your-deepseek-api-key-here') {
      console.warn('[Moderate] DEEPSEEK_API_KEY 未配置，跳过审核');
      return res.json({ flagged: false, categories: [], suggestion: null });
    }

    const systemPrompt = `你是一个吃瓜社区的内容审核助手。你的任务是审核用户发布的文字内容，判断是否违反以下三类规则：

1. 粗俗脏话与不文明用语（abuse）：包含人身攻击、辱骂、歧视性语言、低俗词汇。
2. 极端负面与暴躁宣泄（extreme）：包含极端愤怒的表达、崩溃式宣泄、诅咒、情绪失控的刷屏内容。
3. 商业诋毁与不实指控（commercial）：包含无事实依据的商家攻击、造谣、虚假投诉、恶意中伤。

请以 JSON 格式返回审核结果：
{
  "flagged": true或false,
  "categories": ["abuse", "extreme", "commercial"] 中被触发的类别列表，若未触发则为空数组,
  "suggestion": 如果 flagged 为 true，提供一个温和、友好的改写建议（保留原意但去掉违规表达）；如果 flagged 为 false，此字段为 null
}

注意：
- 正常表达不满、合理批评不属于违规。只有极端、恶意、攻击性的内容才标记为违规。
- 吃瓜相关的俏皮吐槽、幽默表达是允许的，不要过度审查。
- 如果内容安全，flagged 必须为 false，categories 必须为空数组。`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请审核以下吃瓜社区用户发布的内容：\n\n${text.trim()}` }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error('[Moderate] DeepSeek API 返回错误:', response.status);
      return res.json({ flagged: false, categories: [], suggestion: null });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[Moderate] DeepSeek 响应格式异常');
      return res.json({ flagged: false, categories: [], suggestion: null });
    }

    const parsed = JSON.parse(content);
    res.json({
      flagged: parsed.flagged ?? false,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      suggestion: parsed.suggestion ?? null,
    });
  } catch (error) {
    console.error('[Moderate] 审核请求失败:', error.message);
    // Fail open — 任何异常都允许发布
    res.json({ flagged: false, categories: [], suggestion: null });
  }
});

// 获取所有记录
app.get('/chigua-api/records', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const records = getAllRecords(limit, offset);
    const total = getRecordCount();

    res.json({
      records,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('获取记录失败:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 获取热门记录
app.get('/chigua-api/records/popular', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const records = getPopularRecords(limit);

    res.json({
      records
    });
  } catch (error) {
    console.error('获取热门记录失败:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 根据 ID 获取单条记录
app.get('/chigua-api/records/:id', (req, res) => {
  try {
    const { id } = req.params;
    const record = getRecordById(id);

    if (!record) {
      return res.status(404).json({
        error: '未找到该记录'
      });
    }

    res.json(record);
  } catch (error) {
    console.error('获取记录失败:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 创建新记录
app.post('/chigua-api/records', (req, res) => {
  try {
    const record = req.body;

    // 验证必要字段
    if (!record.id || !record.name || !record.message) {
      return res.status(400).json({
        error: '缺少必要字段'
      });
    }

    // 设置默认值
    const newRecord = {
      id: record.id,
      name: record.name || '匿名的脆甜西瓜',
      soundScore: record.soundScore || 0,
      lookScore: record.lookScore || 0,
      overallScore: record.overallScore || 0,
      frequency: record.frequency || 0,
      stripeContrast: record.stripeContrast || 0,
      greenness: record.greenness || 0,
      ripenessStatus: record.ripenessStatus || 'ripe',
      ratedStars: record.ratedStars || 3,
      message: record.message || '',
      timestamp: record.timestamp || Date.now(),
      photoUrl: record.photoUrl || null,
      likes: record.likes || 0,
      location: record.location || null,
      mood: record.mood || null
    };

    saveRecord(newRecord);

    res.status(201).json({
      success: true,
      record: newRecord
    });
  } catch (error) {
    console.error('创建记录失败:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 点赞记录
app.post('/chigua-api/records/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    const success = likeRecord(id);

    if (!success) {
      return res.status(404).json({
        error: '未找到该记录'
      });
    }

    res.json({
      success: true,
      message: '点赞成功'
    });
  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 删除记录
app.delete('/chigua-api/records/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = deleteRecord(id);

    if (!success) {
      return res.status(404).json({
        error: '未找到该记录'
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除记录失败:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message
    });
  }
});

// 提供静态文件（前端构建结果）- 在 /chigua 路径下
app.use('/chigua', express.static(path.join(__dirname, 'dist')));

// 处理前端路由（SPA支持）- 只匹配不包含文件扩展名的路径
// 这样静态文件（如 .js, .css, .png 等）会被上面的静态文件中间件处理
app.get(/^\/chigua(?:\/(?!.*\.[a-z0-9]+$).*)?$/i, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🍉 吃瓜大师全栈服务器运行在 http://localhost:${PORT}`);
  console.log(`📝 前端应用: http://localhost:${PORT}/chigua`);
  console.log(`🔧 健康检查: http://localhost:${PORT}/chigua-api/health`);
  console.log(`🛡️ 内容审核: POST http://localhost:${PORT}/chigua-api/moderate`);
  console.log(`📊 获取记录: GET http://localhost:${PORT}/chigua-api/records`);
  console.log(`🔥 热门记录: GET http://localhost:${PORT}/chigua-api/records/popular`);
  console.log(`➕ 创建记录: POST http://localhost:${PORT}/chigua-api/records`);
  console.log(`❤️ 点赞记录: POST http://localhost:${PORT}/chigua-api/records/:id/like`);
  console.log(`🗑️ 删除记录: DELETE http://localhost:${PORT}/chigua-api/records/:id`);
  console.log(`⚡ 开发模式: 运行 \`npm run dev\` 启动开发服务器`);
});
