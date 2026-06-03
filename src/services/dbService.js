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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_watermelon_timestamp ON watermelon_records(timestamp);
      CREATE INDEX IF NOT EXISTS idx_watermelon_overall_score ON watermelon_records(overall_score);
    `);

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
     greenness, ripeness_status, rated_stars, message, timestamp, photo_url, likes, location, mood)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    record.mood || null
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
    mood: row.mood
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
export function clearAllRecords() {
  const db = getDb();
  const result = db.exec('DELETE FROM watermelon_records');
  console.log(`[DB] 已清空所有西瓜记录`);
  return result;
}

// 导出数据库实例（用于服务器启动时检查）
export { db };
