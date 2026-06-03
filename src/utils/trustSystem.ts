/**
 * 🍉 自治社区信任体系 — 五层制衡
 *
 * 1. 互斥锁：同一通行证对同一条瓜贴只能操作一次（三选一）
 * 2. 日配额：每日点赞20/踩价10/What's Up10
 * 3. 操作冷却：同一通行证2秒内不可连续操作
 * 4. 瓜力消耗：每次操作消耗1点，每日凌晨1:00回复10点
 * 5. 信誉分：被踩价过多的用户降低信誉等级
 *
 * 所有数据存储在 localStorage，每日凌晨1:00随瓜田一起重置
 */

const STORAGE_PREFIX = 'melon_trust_';

export type ActionType = 'like' | 'dispute' | 'whatsup';

interface DailyState {
  date: string;           // YYYY-MM-DD
  likes: number;
  disputes: number;
  whatsups: number;
  remainingPower: number; // 瓜力
  actions: Record<string, ActionType>; // postId → action type（互斥锁）
}

interface TrustProfile {
  totalLikesReceived: number;     // 收到了多少赞（跨天累计）
  totalDisputesReceived: number;  // 收到了多少踩价
  trustLevel: number;             // 0-100
  badge: string;
}

const DAILY_QUOTAS: Record<ActionType, number> = {
  like: 20,
  dispute: 10,
  whatsup: 10,
};

const DAILY_POWER = 10;  // 每日瓜力点数
const COOLDOWN_MS = 2000; // 操作冷却 2 秒
const MAX_DAILY_LIKES = 20;
const MAX_DAILY_DISPUTES = 10;
const MAX_DAILY_WHATSUPS = 10;

// ---- 内部工具 ----

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDailyState(): DailyState {
  const today = getTodayStr();
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + 'daily');
    if (raw) {
      const state: DailyState = JSON.parse(raw);
      if (state.date === today) return state;
    }
  } catch (_) {}

  const fresh: DailyState = {
    date: today,
    likes: 0,
    disputes: 0,
    whatsups: 0,
    remainingPower: DAILY_POWER,
    actions: {},
  };
  saveDailyState(fresh);
  return fresh;
}

function saveDailyState(state: DailyState) {
  localStorage.setItem(STORAGE_PREFIX + 'daily', JSON.stringify(state));
}

// ---- 公共 API ----

/** 检查是否可以执行操作，返回 null 表示通过，否则返回拒绝原因 */
export interface ActionResult {
  allowed: boolean;
  reason?: string;
}

export function canPerformAction(
  passport: string,
  postId: string,
  action: ActionType
): ActionResult {
  const state = getDailyState();

  // 1. 互斥锁：同一帖子只能操作一次
  if (state.actions[postId]) {
    return { allowed: false, reason: '你已经对这瓜贴操作过了～' };
  }

  // 2. 日配额检查
  const quotaKey = action === 'dispute' ? 'disputes' : action === 'whatsup' ? 'whatsups' : 'likes';
  const used = state[quotaKey];
  const max = action === 'dispute' ? MAX_DAILY_DISPUTES : action === 'whatsup' ? MAX_DAILY_WHATSUPS : MAX_DAILY_LIKES;
  if (used >= max) {
    const names: Record<ActionType, string> = { like: '点赞', dispute: '踩价', whatsup: "What's up" };
    return { allowed: false, reason: `今日${names[action]}次数用完了，凌晨刷新～` };
  }

  // 3. 瓜力检查
  if (state.remainingPower <= 0) {
    return { allowed: false, reason: '今日瓜力耗尽！凌晨1点恢复10点🍉' };
  }

  return { allowed: true };
}

/** 冷却检查（基于内存时间戳） */
let lastActionTime = 0;
export function isCoolingDown(): boolean {
  return Date.now() - lastActionTime < COOLDOWN_MS;
}

/** 记录一次操作 */
export function recordAction(postId: string, action: ActionType) {
  const state = getDailyState();

  // 互斥锁
  state.actions[postId] = action;

  // 日配额
  if (action === 'like') state.likes++;
  else if (action === 'dispute') state.disputes++;
  else if (action === 'whatsup') state.whatsups++;

  // 瓜力消耗
  state.remainingPower = Math.max(0, state.remainingPower - 1);

  // 冷却时间戳
  lastActionTime = Date.now();

  saveDailyState(state);
}

/** 获取当前瓜力点数 */
export function getRemainingPower(): number {
  return getDailyState().remainingPower;
}

/** 获取今日剩余配额 */
export function getDailyQuotaRemaining(action: ActionType): number {
  const state = getDailyState();
  const used = action === 'dispute' ? state.disputes : action === 'whatsup' ? state.whatsups : state.likes;
  const max = action === 'dispute' ? MAX_DAILY_DISPUTES : action === 'whatsup' ? MAX_DAILY_WHATSUPS : MAX_DAILY_LIKES;
  return Math.max(0, max - used);
}

// ---- 信誉分（跨天累积） ----

export function getTrustProfile(passport: string): TrustProfile {
  const key = STORAGE_PREFIX + 'profile_' + passport;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (_) {}

  const fresh: TrustProfile = {
    totalLikesReceived: 0,
    totalDisputesReceived: 0,
    trustLevel: 50,
    badge: '🍉 新手上路',
  };
  return fresh;
}

export function updateTrustProfile(passport: string, delta: { likesReceived?: number; disputesReceived?: number }) {
  const profile = getTrustProfile(passport);
  profile.totalLikesReceived += delta.likesReceived || 0;
  profile.totalDisputesReceived += delta.disputesReceived || 0;

  // 信誉分计算：基础50分，赞+1，被踩-3，下限0上限100
  profile.trustLevel = Math.max(0, Math.min(100,
    50 + profile.totalLikesReceived * 1 - profile.totalDisputesReceived * 3
  ));

  // 徽章
  if (profile.trustLevel >= 90) profile.badge = '👑 华强认证';
  else if (profile.trustLevel >= 70) profile.badge = '⭐ 靠谱瓜友';
  else if (profile.trustLevel >= 40) profile.badge = '🍉 普通吃瓜';
  else profile.badge = '🤔 存疑摊主';

  localStorage.setItem(STORAGE_PREFIX + 'profile_' + passport, JSON.stringify(profile));
  return profile;
}

/** 格式化瓜力显示 */
export function formatPower(remaining: number): string {
  const full = '🍉';
  const empty = '🫗';
  return full.repeat(remaining) + empty.repeat(Math.max(0, DAILY_POWER - remaining));
}
