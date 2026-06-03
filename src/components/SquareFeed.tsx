import React, { useState } from 'react';
import { WatermelonRecord } from '../types';
import { ThumbsUp, Calendar, Trophy, Sparkles, MessageSquare, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface SquareFeedProps {
  records: WatermelonRecord[];
  onLike: (id: string) => void;
}

export const SquareFeed: React.FC<SquareFeedProps> = ({ records, onLike }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'leaderboard'>('all');
  const [showSecurityLab, setShowSecurityLab] = useState<boolean>(false);

  const getMoodBadge = (status: 'unripe' | 'ripe' | 'overripe', customMood?: string) => {
    if (customMood) return customMood;
    switch (status) {
      case 'unripe':
        return '🟢 青涩迷茫心境';
      case 'ripe':
        return '❤️ 元气脆甜心情';
      case 'overripe':
        return '🧘 佛系看淡心境';
    }
  };

  const getStatusEmoji = (status: 'unripe' | 'ripe' | 'overripe') => {
    switch (status) {
      case 'unripe':
        return '🟢 生涩青皮';
      case 'ripe':
        return '🍉 黄金脆甜';
      case 'overripe':
        return '🩸 沙瓤至尊';
    }
  };

  const getStatusColor = (status: 'unripe' | 'ripe' | 'overripe') => {
    switch (status) {
      case 'unripe':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'ripe':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      case 'overripe':
        return 'bg-amber-50 text-amber-800 border-amber-300';
    }
  };

  // Sort logic
  const sortedRecords = [...records].sort((a, b) => {
    if (activeTab === 'leaderboard') {
      return b.overallScore - a.overallScore; // high score first
    }
    return b.timestamp - a.timestamp; // newest first
  });

  return (
    <div className="w-full">
      {/* Tab Selectors */}
      <div className="flex bg-amber-50 p-1.5 rounded-2xl border-4 border-emerald-950 mb-6 shadow-[2px_2px_0px_0px_#064e3b]">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-emerald-800 text-white shadow-[0px_3px_0px_0px_#042f24]'
              : 'text-emerald-950 hover:bg-emerald-100'
          }`}
        >
          <MessageSquare size={16} />
          最新瓜贴
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
            activeTab === 'leaderboard'
              ? 'bg-rose-600 text-white shadow-[0px_3px_0px_0px_#9b1c1c]'
              : 'text-emerald-950 hover:bg-emerald-100'
          }`}
        >
          <Trophy size={16} />
          吃瓜硬实力榜
        </button>
      </div>

      {/* 🛡️ 吃瓜大师安全机制大科普 */}
      <div className="bg-sky-50 border-2 border-emerald-950 rounded-2xl p-3.5 mb-6 shadow-[2px_2px_0px_0px_#064e3b]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-sky-950 flex items-center gap-1.5">
            <span>🛡️</span> 吃瓜大师技术科普：关于数据持久化、SQLite与反刷屏设计
          </span>
          <button
            onClick={() => setShowSecurityLab(!showSecurityLab)}
            className="text-[10px] font-black text-sky-950 hover:text-sky-900 bg-white border-2 border-emerald-950 px-2 py-0.5 rounded-lg shadow-[1px_1px_0px_0px_#064e3b] transition-all active:translate-y-[1px]"
          >
            {showSecurityLab ? '收起详情 🔼' : '点击展开 🔽'}
          </button>
        </div>

        {showSecurityLab && (
          <div className="mt-3pt-3 border-t-2 border-dashed border-sky-950/10 space-y-3.5 text-[11px] leading-relaxed text-sky-900 font-sans">
            <div>
              <p className="font-extrabold text-sky-950">💾 Q1: 这个小应用的数据持久化怎么做？考虑用 SQLite 吗？</p>
              <div className="pl-4 mt-1 text-sky-950/85 font-bold">
                <p>💡 <strong>单机与离线环境</strong>：目前本程序采用 <code>localStorage</code>，将您测评、打分的本地西瓜和您发表在广场的帖子无缝归集，刷新浏览器或关闭标签也不会丢失，对单玩家或本地闭环测试极其可靠！</p>
                <p className="mt-1">💡 <strong>为什么没有采用 SQLite</strong>：SQLite 是本机的单文件锁数据库。在现代<strong>云端动态扩容弹性架构（如多节点部署、Serverless 容器如 Cloud Run）</strong>中，每次发布或冷启动容器都会重置本地临时磁盘。若有多个端同时读写单文件 SQLite 会触发磁盘 IO 独占锁。因此，在多人联机部署中，<strong>真正的最优方案是将数据对接到 Google Firestore（无服务器云 NoSQL 存储）</strong>，拥有完美的端对端数据高吞吐实时同步能力！</p>
              </div>
            </div>

            <div className="border-t border-dashed border-sky-950/5 pt-3">
              <p className="font-extrabold text-sky-950">🛡️ Q2: 如何避免被恶意机械刷屏？需要做强制用户注册吗？</p>
              <div className="pl-4 mt-1 text-sky-950/85 font-bold">
                <p>💡 <strong>不妥协的无痕免注册体验</strong>：为了保持吃瓜广场“即开即用、清爽可爱”的灵魂，我们声明<strong>绝不强制要求您注册手机或账号</strong>（拒绝搜集一切隐私）。作为代替，系统在各个端首次运行阶段，利用随机数生成您专属独特的<strong>【吃瓜通行证 ID】</strong>（例如 <code>🍉 吃瓜群众_#5829</code>），与本地状态绑定。</p>
                <p className="mt-1">💡 <strong>冰镇倒计时限流法</strong>：系统内置了 <strong>“60 秒冰箱物理冰冻倒计时”</strong>，此冷却时间保存于存储中，未清温前无法发布瓜贴。这样在无需账号的极其极简的零摩擦环境里，安全阻断了狂躁手速刷屏倾向，十分清凉科学！</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {sortedRecords.length === 0 ? (
        <div className="text-center py-12 bg-[#FFFDF5] rounded-3xl border-4 border-dashed border-emerald-900/30">
          <p className="text-emerald-950 font-bold text-lg mb-2">🍉 晒瓜广场目前空空如也</p>
          <p className="text-emerald-800/80 text-xs">快去测试瓜的甜度，拍个照写句评语，晒出你的好瓜吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedRecords.map((item, index) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              key={item.id}
              className="relative bg-white border-4 border-emerald-950 rounded-3xl p-4 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200 shadow-[4px_4px_0px_0px_#064e3b]"
            >
              {/* Leaderboard Rank Badge */}
              {activeTab === 'leaderboard' && (
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-amber-400 border-4 border-emerald-950 rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_#064e3b] z-10">
                  <span className="font-extrabold text-emerald-950 text-sm">
                    {index === 0 ? '👑' : index + 1}
                  </span>
                </div>
              )}

              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-col">
                    <span className="font-extrabold text-emerald-950 text-base flex items-center gap-1">
                      {item.name}
                      {item.overallScore >= 95 && <Sparkles className="text-amber-500 fill-amber-300" size={16} />}
                    </span>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                      <span className="text-[10px] text-emerald-800 flex items-center gap-1 font-mono">
                        <Calendar size={10} />
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                      {item.location && (
                        <span className="text-[9.5px] text-rose-800 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60 leading-none font-sans">
                          {item.location}
                        </span>
                      )}
                      <span className="text-[9.5px] text-teal-800 font-extrabold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60 leading-none font-sans">
                        🧠 {getMoodBadge(item.ripenessStatus, item.mood)}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border-2 ${getStatusColor(item.ripenessStatus)}`}>
                    {getStatusEmoji(item.ripenessStatus)}
                  </span>
                </div>

                {/* Picture or avatar placeholder */}
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-emerald-950/70 bg-[#F4FBF7] mb-3 flex items-center justify-center group h-36">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt={item.name}
                      className="w-full h-full object-contain p-2"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-4xl select-none">🍉</span>
                  )}
                  {/* Watermark Score */}
                  <div className="absolute right-2 bottom-2 bg-emerald-950/90 text-white font-mono font-black text-xs px-2 py-1 rounded-lg border border-emerald-700">
                    成熟度: {item.overallScore}%
                  </div>
                </div>

                {/* Stars and numbers details */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < item.ratedStars ? 'currentColor' : 'none'}
                        className={i < item.ratedStars ? 'fill-amber-400' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    声频: {item.frequency}Hz
                  </div>
                  <div className="text-[10px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    条纹: {Math.round(item.stripeContrast * 100)}%
                  </div>
                </div>

                {/* Comments */}
                <p className="text-emerald-950 text-xs font-medium leading-relaxed bg-amber-50/50 p-2.5 rounded-xl border-2 border-dashed border-emerald-900/10 mb-4 italic">
                  “ {item.message || '这个吃瓜群众很懒，只留下了分数默默走开。'} ”
                </p>
              </div>

              {/* Interaction Footer */}
              <div className="flex items-center justify-between border-t border-emerald-900/10 pt-3 mt-1">
                <span className="text-[11px] font-bold text-emerald-800">
                  🍉 评分: <span className="text-rose-600 font-extrabold text-sm">{item.ratedStars}星</span>
                </span>
                
                <button
                  onClick={() => onLike(item.id)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 border-2 border-rose-900 text-rose-700 hover:text-rose-800 font-extrabold text-xs rounded-xl transition-all duration-200 active:scale-95 shadow-[1.5px_1.5px_0px_0px_#9b1c1c]"
                >
                  <ThumbsUp size={12} className="fill-rose-100 hover:fill-rose-200" />
                  赞瓜度 {item.likes}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
