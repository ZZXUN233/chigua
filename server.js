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
  whatsUpRecord,
  disputePriceRecord,
  deleteRecord,
  getRecordCount,
  getPopularRecords,
  clearAllRecords,
  getMarketIndex,
  saveDailySnapshot,
  getMarketHistory,
  getPriceHistory,
  getDb
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

// --- 安全中间件 ---

// Shared secret 鉴权（保护 AI API 端点不被外部滥用）
const requireSharedSecret = (req, res, next) => {
  const expected = process.env.SHARED_SECRET;
  // 未配置时 fail-open（开发环境兼容）
  if (!expected || expected === 'your-shared-secret-here') {
    return next();
  }
  const secret = req.headers['x-shared-secret'];
  if (secret !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
};

// 简易内存频率限制（防止 AI API 被刷爆）
const rateLimitMap = new Map();
function aiRateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = `rate:${ip}:${req.path}`;
  const now = Date.now();
  const windowMs = 60_000;   // 1 分钟窗口
  const maxRequests = 10;    // 最多 10 次/分钟

  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
  }
  next();
}

// 定期清理 rate limit map，防止内存泄漏
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 300_000); // 每 5 分钟清理一次

// --- 每日凌晨 1:00 清空 SQLite 数据（不吃隔夜瓜） ---
function scheduleDailyReset() {
  const now = new Date();
  const next1AM = new Date(now);
  next1AM.setDate(next1AM.getDate() + 1);
  next1AM.setHours(1, 0, 0, 0);
  const msUntil1AM = next1AM.getTime() - now.getTime();

  console.log(`[Reset] 距离下次凌晨 1:00 清空数据还有 ${Math.round(msUntil1AM / 3600000)} 小时`);

  setTimeout(() => {
    console.log('[Reset] 🕐 凌晨 1:00 — 不吃隔夜瓜！清除当日晒瓜数据');
    try {
      saveDailySnapshot();  // 先存档今日行情到历史表
      clearAllRecords();
      marketCache = { data: null, ts: 0 };
      console.log('[Reset] ✅ SQLite 数据已清空，行情已存档，新一天的吃瓜开始！');
    } catch (err) {
      console.error('[Reset] 清空数据失败:', err.message);
    }
    // 之后每 24 小时执行一次
    setInterval(() => {
      console.log('[Reset] 🕐 凌晨 1:00 — 不吃隔夜瓜！清除当日晒瓜数据');
      try {
        saveDailySnapshot();
        clearAllRecords();
        marketCache = { data: null, ts: 0 };
        console.log('[Reset] ✅ SQLite 数据已清空，行情已存档，新一天的吃瓜开始！');
      } catch (err) {
        console.error('[Reset] 清空数据失败:', err.message);
      }
    }, 24 * 60 * 60 * 1000);
  }, msUntil1AM);
}

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
app.post('/chigua-api/moderate', requireSharedSecret, aiRateLimit, async (req, res) => {
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

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr) {
      console.error('[Moderate] JSON 解析失败:', parseErr.message);
      return res.json({ flagged: false, categories: [], suggestion: null });
    }
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

// 华强语气改写
app.post('/chigua-api/huaqiang-rewrite', requireSharedSecret, aiRateLimit, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: '请提供需要改写的文本' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === 'your-deepseek-api-key-here') {
      return res.json({ rewritten: text });
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是《征服》里的刘华强。用华强的语气（嚣张、质问、江湖气）改写用户的话。加入"哥们儿""What\'s up""这瓜保熟吗""萨日朗""生瓜蛋子""给你机会你不中用啊"等经典台词风味。控制在50字以内。直接输出改写结果，不要解释。' },
          { role: 'user', content: text.trim() }
        ],
        temperature: 0.9,
        max_tokens: 150,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) return res.json({ rewritten: text });
    const data = await response.json();
    const rewritten = data.choices?.[0]?.message?.content?.trim() || text;
    res.json({ rewritten });
  } catch (err) {
    console.error('[Huaqiang] 改写失败:', err.message);
    res.json({ rewritten: req.body?.text || '' });
  }
});

// 西瓜检测（对接 DeepSeek Vision API）
app.post('/chigua-api/detect-watermelon', requireSharedSecret, aiRateLimit, async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: '请提供 base64 编码的图片' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === 'your-deepseek-api-key-here') {
      console.warn('[Detect] DEEPSEEK_API_KEY 未配置，跳过检测');
      return res.json({ hasWatermelon: true, confidence: 'unknown', description: 'API key 未配置' });
    }

    // Ensure the base64 data has a proper data URI prefix
    const imageUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const systemPrompt = `你是一个西瓜检测助手。你的任务是判断用户上传的图片中是否有一个完整的西瓜。

判断标准：
- 整个圆形或椭圆形的西瓜（有或没有切开）→ 有西瓜
- 切开的西瓜块、西瓜片 → 有西瓜
- 被手拿着或放在桌上的西瓜 → 有西瓜
- 只有西瓜皮、西瓜籽、没有西瓜的画面 → 没有西瓜
- 其他水果（苹果、橙子等）→ 没有西瓜
- 没有人或物体的空镜 → 没有西瓜
- 纯色背景、模糊画面 → 没有西瓜

请以 JSON 格式返回检测结果：
{
  "hasWatermelon": true或false,
  "confidence": "high"、"medium" 或 "low",
  "description": "简短中文描述画面中看到的内容（20字以内）"
}`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-vl2',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
              {
                type: 'text',
                text: '请判断这张图片中是否有一个西瓜。',
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error('[Detect] DeepSeek API 返回错误:', response.status);
      return res.json({ hasWatermelon: true, confidence: 'unknown', description: 'API 异常' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[Detect] DeepSeek 响应格式异常');
      return res.json({ hasWatermelon: true, confidence: 'unknown', description: '响应异常' });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr) {
      console.error('[Detect] JSON 解析失败:', parseErr.message);
      return res.json({ hasWatermelon: true, confidence: 'unknown', description: 'JSON 异常' });
    }
    res.json({
      hasWatermelon: parsed.hasWatermelon ?? true,
      confidence: parsed.confidence ?? 'unknown',
      description: parsed.description ?? '',
    });
  } catch (error) {
    console.error('[Detect] 检测请求失败:', error.message);
    // Fail open — 任何异常都允许继续拍照
    res.json({ hasWatermelon: true, confidence: 'unknown', description: '网络异常' });
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

// 华强买瓜：今日行情看板（5分钟缓存）
let marketCache = { data: null, ts: 0 };
const MARKET_CACHE_TTL = 5 * 60 * 1000; // 5 min

function generateHuaqiangComment(index) {
  if (index.totalRecords === 0) return '你瞧瞧现在哪有瓜呀，这都是大棚的瓜！';
  if (index.totalPriceReports === 0) return '还没人报价格呢，华强等着呢～';

  const { avgPrice, ripeRate, rawRate, selfSplitRate } = index;

  if (rawRate > 0.4) return '生瓜蛋子这么多？给你机会你不中用啊！';
  if (avgPrice !== null && avgPrice < 1) return '这价比瓜皮子还便宜！华强狂喜～🍉';
  if (avgPrice !== null && avgPrice >= 8) return "What's up！这瓜皮子是金子做的还是瓜粒子是金子做的？";
  if (ripeRate > 0.7 && avgPrice !== null && avgPrice < 5) return '这届瓜农还行，熟瓜多价格也公道！';
  if (selfSplitRate > 0.6) return '都是劈瓜勇士！萨日朗～🔪';
  if (avgPrice !== null && avgPrice >= 5) return '价格有点小贵，但瓜熟就行。这瓜保熟吗？';
  return '吃瓜群众的眼睛是雪亮的，买不了吃亏买不了上当！';
}

app.get('/chigua-api/market-index', (req, res) => {
  try {
    const now = Date.now();
    if (marketCache.data && now - marketCache.ts < MARKET_CACHE_TTL) {
      return res.json(marketCache.data);
    }

    const index = getMarketIndex();
    // 获取昨日对比
    const history = getMarketHistory(2);
    const yesterday = history.length >= 2 ? history[1] : null;  // [0]=today, [1]=yesterday if exists before reset
    const lastEntry = history[0];

    const result = {
      avgPrice: index.avgPrice,
      totalPriceReports: index.totalPriceReports,
      totalRecords: index.totalRecords,
      rawRate: Math.round(index.rawRate * 100),
      ripeRate: Math.round(index.ripeRate * 100),
      overripeRate: Math.round(index.overripeRate * 100),
      selfSplitRate: Math.round(index.selfSplitRate * 100),
      huaqiangComment: generateHuaqiangComment(index),
      cityStats: index.cityStats || [],
      // 昨日对比（用于行情面板趋势箭头）
      yesterday: lastEntry ? {
        date: lastEntry.date,
        avgPrice: lastEntry.avgPrice,
        totalRecords: lastEntry.totalRecords,
        ripeRate: lastEntry.ripeRate,
      } : null,
      priceHistory: getPriceHistory(14),
    };

    marketCache = { data: result, ts: now };
    res.json(result);
  } catch (error) {
    console.error('[Market] 行情查询失败:', error);
    res.status(500).json({ error: '行情查询失败' });
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
      mood: record.mood || null,
      pricePerJin: record.pricePerJin ?? null,
      isSelfSplit: record.isSelfSplit ?? false,
      purchaseLocation: record.purchaseLocation || null
    };

    // --- L1 统计风控：价格校验 ---
    if (newRecord.pricePerJin != null) {
      // 硬限制：瓜价不能离谱
      if (newRecord.pricePerJin <= 0 || newRecord.pricePerJin > 30) {
        console.warn(`[AntiFraud] 价格异常拒绝: ¥${newRecord.pricePerJin}/斤 (id=${newRecord.id})`);
        newRecord.pricePerJin = null; // 丢弃离谱价格，其他字段仍正常保存
      } else {
        // 同城市均价偏离检测（3σ 外标记但不禁用）
        try {
          const recent = getDb().prepare(`
            SELECT AVG(price_per_jin) as avg_p, COUNT(*) as cnt
            FROM watermelon_records
            WHERE purchase_location = ? AND price_per_jin IS NOT NULL AND price_per_jin > 0
          `).get(newRecord.purchaseLocation || '');

          if (recent && recent.cnt >= 3 && recent.avg_p) {
            // 简易方差计算：用城市已有数据的标准差
            const devs = getDb().prepare(`
              SELECT price_per_jin FROM watermelon_records
              WHERE purchase_location = ? AND price_per_jin IS NOT NULL AND price_per_jin > 0
            `).all(newRecord.purchaseLocation);

            if (devs.length >= 3) {
              const prices = devs.map(r => r.price_per_jin);
              const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
              const variance = prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length;
              const stdDev = Math.sqrt(variance);
              const deviation = Math.abs(newRecord.pricePerJin - mean);

              if (stdDev > 0 && deviation > 3 * stdDev) {
                console.warn(`[AntiFraud] 价格偏离城市均值>3σ: ¥${newRecord.pricePerJin}/斤 vs 均值¥${mean.toFixed(1)}±${stdDev.toFixed(1)} (${newRecord.purchaseLocation})`);
                // 标记但不丢弃——可能是真实低价/高价
              }
            }
          }
        } catch (e) {
          console.warn('[AntiFraud] 偏离检测异常:', e.message);
        }
      }
    }
    // --- L1 风控结束 ---

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

// What's up! 反应
app.post('/chigua-api/records/:id/whatsup', (req, res) => {
  try {
    const { id } = req.params;
    const success = whatsUpRecord(id);
    if (!success) return res.status(404).json({ error: '未找到该记录' });
    res.json({ success: true });
  } catch (error) {
    console.error('WhatsUp 失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 踩价（降低报价行情权重）
app.post('/chigua-api/records/:id/dispute-price', (req, res) => {
  try {
    const { id } = req.params;
    const success = disputePriceRecord(id);
    if (!success) return res.status(404).json({ error: '未找到该记录' });
    res.json({ success: true });
  } catch (error) {
    console.error('Dispute 失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
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

// 启动每日凌晨数据清空
scheduleDailyReset();

// 启动服务器
app.listen(PORT, () => {
  console.log(`🍉 吃瓜大师全栈服务器运行在 http://localhost:${PORT}`);
  console.log(`📝 前端应用: http://localhost:${PORT}/chigua`);
  console.log(`🔧 健康检查: http://localhost:${PORT}/chigua-api/health`);
  console.log(`🛡️ 内容审核: POST http://localhost:${PORT}/chigua-api/moderate`);
  console.log(`🔍 西瓜检测: POST http://localhost:${PORT}/chigua-api/detect-watermelon`);
  console.log(`📈 行情看板: GET http://localhost:${PORT}/chigua-api/market-index`);
  console.log(`📊 获取记录: GET http://localhost:${PORT}/chigua-api/records`);
  console.log(`🔥 热门记录: GET http://localhost:${PORT}/chigua-api/records/popular`);
  console.log(`➕ 创建记录: POST http://localhost:${PORT}/chigua-api/records`);
  console.log(`❤️ 点赞记录: POST http://localhost:${PORT}/chigua-api/records/:id/like`);
  console.log(`🗑️ 删除记录: DELETE http://localhost:${PORT}/chigua-api/records/:id`);
  console.log(`⚡ 开发模式: 运行 \`npm run dev\` 启动开发服务器`);
});
