import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite 数据库配置
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'chigua.db');

let db = null;

/**
 * 初始化 SQLite 数据库
 */
export function getDb() {
  if (!db) {
    console.log(`SQLite 数据库路径: ${DB_PATH}`);

    // 确保数据目录存在
    const dbDir = path.dirname(DB_PATH);
    import('fs').then(fs => {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    });

    db = new Database(DB_PATH);

    // 启用 WAL 模式以提高并发性能
    db.pragma('journal_mode = WAL');

    // 创建表
    db.exec(`
      CREATE TABLE IF NOT EXISTS watermelon_records (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '匿名的脆甜西瓜',
        sound_score INTEGER NOT NULL DEFAULT 0,
        look_score INTEGER NOT NULL DEFAULT 0,
        overall_score INTEGER NOT NULL DEFAULT 0,
        frequency INTEGER NOT NULL DEFAULT 0,
        stripe_contrast REAL NOT NULL DEFAULT 0,
        greenness REAL NOT NULL DEFAULT 0,
        ripeness_status TEXT NOT NULL DEFAULT 'ripe',
        rated_stars INTEGER NOT NULL DEFAULT 3,
        message TEXT NOT NULL DEFAULT '',
        timestamp INTEGER NOT NULL,
        photo_url TEXT,
        likes INTEGER NOT NULL DEFAULT 0,
        location TEXT,
        mood TEXT,
        price_per_jin REAL,
        is_self_split INTEGER DEFAULT 0,
        purchase_location TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_watermelon_timestamp ON watermelon_records(timestamp);
      CREATE INDEX IF NOT EXISTS idx_watermelon_overall_score ON watermelon_records(overall_score);

      -- 行情历史表（跨天持久化，不被每日重置清空）
      CREATE TABLE IF NOT EXISTS market_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        avg_price REAL,
        total_records INTEGER DEFAULT 0,
        price_reports INTEGER DEFAULT 0,
        raw_rate REAL DEFAULT 0,
        ripe_rate REAL DEFAULT 0,
        overripe_rate REAL DEFAULT 0,
        self_split_rate REAL DEFAULT 0,
        top_cities TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_market_history_date ON market_history(date);
    `);

    // 华强买瓜：新增价格行情字段（兼容旧表）
    const newCols = [
      'ALTER TABLE watermelon_records ADD COLUMN price_per_jin REAL',
      'ALTER TABLE watermelon_records ADD COLUMN is_self_split INTEGER DEFAULT 0',
      'ALTER TABLE watermelon_records ADD COLUMN purchase_location TEXT',
    ];
    for (const sql of newCols) {
      try { db.exec(sql); } catch (_) { /* 列已存在则跳过 */ }
    }

    console.log('SQLite 数据库初始化完成');
  }
  return db;
}

/**
 * 保存西瓜记录到数据库
 */
export function saveRecord(record) {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO watermelon_records
    (id, name, sound_score, look_score, overall_score, frequency, stripe_contrast,
     greenness, ripeness_status, rated_stars, message, timestamp, photo_url, likes,
     location, mood, price_per_jin, is_self_split, purchase_location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    record.id,
    record.name,
    record.soundScore,
    record.lookScore,
    record.overallScore,
    record.frequency,
    record.stripeContrast,
    record.greenness,
    record.ripenessStatus,
    record.ratedStars,
    record.message,
    record.timestamp,
    record.photoUrl || null,
    record.likes,
    record.location || null,
    record.mood || null,
    record.pricePerJin ?? null,
    record.isSelfSplit ? 1 : 0,
    record.purchaseLocation || null
  );

  return record.id;
}

/**
 * 获取所有西瓜记录（按时间倒序）
 */
export function getAllRecords(limit = 100, offset = 0) {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT * FROM watermelon_records
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(limit, offset);

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    soundScore: row.sound_score,
    lookScore: row.look_score,
    overallScore: row.overall_score,
    frequency: row.frequency,
    stripeContrast: row.stripe_contrast,
    greenness: row.greenness,
    ripenessStatus: row.ripeness_status,
    ratedStars: row.rated_stars,
    message: row.message,
    timestamp: row.timestamp,
    photoUrl: row.photo_url,
    likes: row.likes,
    location: row.location,
    mood: row.mood
  }));
}

/**
 * 根据 ID 获取单条记录
 */
export function getRecordById(id) {
  const db = getDb();

  const stmt = db.prepare('SELECT * FROM watermelon_records WHERE id = ?');
  const row = stmt.get(id);

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    soundScore: row.sound_score,
    lookScore: row.look_score,
    overallScore: row.overall_score,
    frequency: row.frequency,
    stripeContrast: row.stripe_contrast,
    greenness: row.greenness,
    ripenessStatus: row.ripeness_status,
    ratedStars: row.rated_stars,
    message: row.message,
    timestamp: row.timestamp,
    photoUrl: row.photo_url,
    likes: row.likes,
    location: row.location,
    mood: row.mood,
    pricePerJin: row.price_per_jin ?? undefined,
    isSelfSplit: row.is_self_split === 1,
    purchaseLocation: row.purchase_location || undefined
  };
}

/**
 * 点赞记录
 */
export function likeRecord(id) {
  const db = getDb();

  const stmt = db.prepare('UPDATE watermelon_records SET likes = likes + 1 WHERE id = ?');
  const result = stmt.run(id);

  return result.changes > 0;
}

/**
 * 删除记录
 */
export function deleteRecord(id) {
  const db = getDb();

  const stmt = db.prepare('DELETE FROM watermelon_records WHERE id = ?');
  const result = stmt.run(id);

  return result.changes > 0;
}

/**
 * 获取记录总数
 */
export function getRecordCount() {
  const db = getDb();

  const stmt = db.prepare('SELECT COUNT(*) as count FROM watermelon_records');
  const row = stmt.get();

  return row.count;
}

/**
 * 获取热门记录（按点赞数排序）
 */
export function getPopularRecords(limit = 20) {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT * FROM watermelon_records
    ORDER BY likes DESC, timestamp DESC
    LIMIT ?
  `);

  const rows = stmt.all(limit);

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    soundScore: row.sound_score,
    lookScore: row.look_score,
    overallScore: row.overall_score,
    frequency: row.frequency,
    stripeContrast: row.stripe_contrast,
    greenness: row.greenness,
    ripenessStatus: row.ripeness_status,
    ratedStars: row.rated_stars,
    message: row.message,
    timestamp: row.timestamp,
    photoUrl: row.photo_url,
    likes: row.likes,
    location: row.location,
    mood: row.mood
  }));
}

/**
 * 清空所有西瓜记录（每日凌晨重置用）
 */
/**
 * 在每日重置前保存今日行情快照到历史表
 */
export function saveDailySnapshot() {
  const db = getDb();
  const index = getMarketIndex();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  db.prepare(`
    INSERT OR REPLACE INTO market_history
    (date, avg_price, total_records, price_reports, raw_rate, ripe_rate, overripe_rate, self_split_rate, top_cities)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    today,
    index.avgPrice,
    index.totalRecords,
    index.totalPriceReports,
    Math.round(index.rawRate * 100),
    Math.round(index.ripeRate * 100),
    Math.round(index.overripeRate * 100),
    Math.round(index.selfSplitRate * 100),
    JSON.stringify(index.cityStats || [])
  );

  console.log(`[DB] 已存档今日行情快照: ${today}`);
  return today;
}

/**
 * 获取瓜价走势数据（最近 N 天，用于 K 线图）
 */
export function getPriceHistory(days = 14) {
  const db = getDb();
  // 历史快照
  const historyRows = db.prepare(`
    SELECT date, avg_price, ripe_rate, total_records
    FROM market_history
    ORDER BY date DESC
    LIMIT ?
  `).all(days);

  // 今日实时数据
  const todayIndex = getMarketIndex();

  const todayEntry = {
    date: new Date().toISOString().slice(0, 10),
    avgPrice: todayIndex.avgPrice,
    ripeRate: Math.round(todayIndex.ripeRate * 100),
    totalRecords: todayIndex.totalRecords,
  };

  // 合并：今日在前，历史在后（避免重复）
  const merged = [todayEntry];
  for (const r of historyRows) {
    if (r.date !== todayEntry.date) {
      merged.push({
        date: r.date,
        avgPrice: r.avg_price,
        ripeRate: r.ripe_rate,
        totalRecords: r.total_records,
      });
    }
  }

  // 按日期升序排列（图表从左到右）
  return merged.reverse();
}

/**
 * 获取历史行情记录（最近 N 天）
 */
export function getMarketHistory(days = 7) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM market_history
    ORDER BY date DESC
    LIMIT ?
  `).all(days);

  return rows.map(r => ({
    date: r.date,
    avgPrice: r.avg_price,
    totalRecords: r.total_records,
    priceReports: r.price_reports,
    rawRate: r.raw_rate,
    ripeRate: r.ripe_rate,
    overripeRate: r.overripe_rate,
    selfSplitRate: r.self_split_rate,
    topCities: r.top_cities ? JSON.parse(r.top_cities) : [],
  }));
}

/**
 * 获取今日行情聚合指数
 */
export function getMarketIndex() {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      COUNT(*) as total,
      AVG(price_per_jin) as avg_price,
      SUM(CASE WHEN ripeness_status = 'unripe' THEN 1 ELSE 0 END) as raw_count,
      SUM(CASE WHEN ripeness_status = 'ripe' THEN 1 ELSE 0 END) as ripe_count,
      SUM(CASE WHEN ripeness_status = 'overripe' THEN 1 ELSE 0 END) as overripe_count,
      SUM(CASE WHEN is_self_split = 1 THEN 1 ELSE 0 END) as self_split_count,
      SUM(CASE WHEN price_per_jin IS NOT NULL THEN 1 ELSE 0 END) as price_reports
    FROM watermelon_records
  `).get();

  const total = row.total || 0;
  const priceReports = row.price_reports || 0;

  // 按城市统计均价
  const cityRows = db.prepare(`
    SELECT
      purchase_location as city,
      COUNT(*) as cnt,
      AVG(price_per_jin) as avg_p
    FROM watermelon_records
    WHERE purchase_location IS NOT NULL AND purchase_location != '' AND price_per_jin IS NOT NULL
    GROUP BY purchase_location
    ORDER BY cnt DESC
    LIMIT 6
  `).all();

  const cityStats = cityRows.map(r => ({
    city: r.city,
    count: r.cnt,
    avgPrice: Math.round(r.avg_p * 100) / 100,
  }));

  return {
    avgPrice: priceReports > 0 ? Math.round(row.avg_price * 100) / 100 : null,
    totalPriceReports: priceReports,
    totalRecords: total,
    rawRate: total > 0 ? (row.raw_count || 0) / total : 0,
    ripeRate: total > 0 ? (row.ripe_count || 0) / total : 0,
    overripeRate: total > 0 ? (row.overripe_count || 0) / total : 0,
    selfSplitRate: total > 0 ? (row.self_split_count || 0) / total : 0,
    cityStats,
  };
}

/**
 * 清空所有西瓜记录（每日凌晨重置用）
 */
export function clearAllRecords() {
  const db = getDb();
  const result = db.exec('DELETE FROM watermelon_records');
  console.log(`[DB] 已清空所有西瓜记录`);
  return result;
}

// 导出数据库实例（用于服务器启动时检查）
export { db };
