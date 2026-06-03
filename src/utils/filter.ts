export interface FilterResult {
  cleanText: string;
  hasSensitive: boolean;
  detectedWords: string[];
}

export interface RuleCategory {
  id: string;
  category: string;
  desc: string;
  words: string[];
  replacement: string;
}

export const FILTER_RULES: RuleCategory[] = [
  {
    id: "abuse",
    category: "🚫 粗俗脏话与不文明用语",
    desc: "严禁骂人、人身攻击。净化后的世界充盈美味好瓜。",
    words: ["垃圾", "傻子", "傻逼", "弱智", "脑残", "混蛋", "滚蛋", "畜生", "死瓜", "贱人", "二货", "暴毙", "狗屁", "死妈", "死爸", "傻叉", "卧槽", "操蛋", "他妈", "特么"],
    replacement: "🍉极品爆汁沙瓤瓜🍉"
  },
  {
    id: "extreme",
    category: "⛈️ 极端负面与暴躁宣泄",
    desc: "夏日消暑，拒绝负能量刷屏。降燥词汇会替代为您送上清凉。",
    words: ["气死", "气炸", "崩溃", "发疯", "倒霉", "恶心", "倒八辈子霉", "气死我了", "要命", "无语子", "吐了", "完蛋"],
    replacement: "🍧吃个冰镇碎碎冰消消温🍧"
  },
  {
    id: "commercial",
    category: "⚠️ 维权情绪化过度吐槽",
    desc: "拒绝无端造谣与情绪化攻击，保留良心西瓜商贩的温存。",
    words: ["受骗", "欺骗", "垃圾商家", "奸商", "宰客", "骗子", "假货", "黑心", "黑心商贩", "坑爹"],
    replacement: "🍦咬口五彩甜雪糕消消暑🍦"
  }
];

export function filterSensitiveWords(text: string): FilterResult {
  let cleanText = text;
  let hasSensitive = false;
  const detectedWords: string[] = [];

  // Flatten and sort words by length descending to match long patterns first
  const allWordMappings = FILTER_RULES.flatMap(rule => 
    rule.words.map(w => ({ word: w, replacement: rule.replacement }))
  ).sort((a, b) => b.word.length - a.word.length);

  for (const { word, replacement } of allWordMappings) {
    if (cleanText.includes(word)) {
      hasSensitive = true;
      if (!detectedWords.includes(word)) {
        detectedWords.push(word);
      }
      // Replace safe regex escape
      const escaped = word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      cleanText = cleanText.replace(regex, replacement);
    }
  }

  return {
    cleanText,
    hasSensitive,
    detectedWords
  };
}
