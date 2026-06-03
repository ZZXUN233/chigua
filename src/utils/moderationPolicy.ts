export interface ModerationCategory {
  id: string;
  category: string;
  desc: string;
  icon: string;
  examples: string;
}

export const MODERATION_POLICY: ModerationCategory[] = [
  {
    id: "abuse",
    category: "粗俗脏话与不文明用语",
    icon: "🚫",
    desc: "严禁人身攻击、辱骂、歧视性语言。AI 审核将识别粗鄙词汇和不文明表达，提示您用友善的方式分享吃瓜体验。",
    examples: "禁止对他人进行侮辱、谩骂或使用低俗词汇进行人身攻击"
  },
  {
    id: "extreme",
    category: "极端负面与暴躁宣泄",
    icon: "⛈️",
    desc: "拒绝极端负面情绪刷屏。AI 审核将识别狂躁、崩溃式宣泄内容，引导大家用更平和的心态分享吃瓜心得。",
    examples: "避免极端的愤怒宣泄、诅咒式表达或情绪失控的刷屏内容"
  },
  {
    id: "commercial",
    category: "商业诋毁与不实指控",
    icon: "⚠️",
    desc: "拒绝无证据的商业攻击和造谣。AI 审核将识别对商家的情绪化诋毁和虚假指控，保护良性讨论氛围。",
    examples: "禁止无事实依据的商家攻击、虚假投诉或恶意中伤"
  }
];
