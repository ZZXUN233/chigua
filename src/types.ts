export type WatermelonStatus = 'unripe' | 'ripe' | 'overripe';

export interface MarketIndex {
  avgPrice: number | null;       // 今日均价（元/斤），null 表示无数据
  totalPriceReports: number;    // 收到报价数
  totalRecords: number;         // 总记录数
  rawRate: number;              // 生瓜率
  ripeRate: number;             // 熟瓜率
  overripeRate: number;         // 熟透率
  selfSplitRate: number;        // 自己劈瓜比例
  huaqiangComment: string;      // 华强 AI 锐评
  cityStats: CityStat[];        // 各城市瓜价
  yesterday: {                  // 昨日行情（null=暂无历史数据）
    date: string;
    avgPrice: number | null;
    totalRecords: number;
    ripeRate: number;
  } | null;
  priceHistory: PricePoint[];   // 瓜价走势（最近14天）
}

export interface CityStat {
  city: string;
  count: number;
  avgPrice: number;
}

export interface PricePoint {
  date: string;
  avgPrice: number | null;
  ripeRate: number;
  totalRecords: number;
}

export interface WatermelonRecord {
  id: string;
  name: string;
  soundScore: number;
  lookScore: number;
  overallScore: number;
  frequency: number;
  stripeContrast: number; // 0 to 1
  greenness: number; // 0 to 1
  ripenessStatus: WatermelonStatus;
  ratedStars: number;
  message: string;
  timestamp: number;
  photoUrl?: string; // base64 representation of scanned image, or watermelon avatar
  likes: number;
  whatsUp: number;              // What's up! 🤨 反应数
  priceDisputes: number;         // 🙅 踩价数（降低该报价在行情中的权重）
  location?: string;
  mood?: string;
  // 华强买瓜：价格行情
  pricePerJin?: number;          // 每市斤价格（元）
  isSelfSplit?: boolean;         // 是否自己劈瓜
  purchaseLocation?: string;     // 购买地点
}
