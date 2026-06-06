import React, { useState } from 'react';
import { WatermelonRecord } from '../types';
import { ThumbsUp, Calendar, Trophy, Sparkles, MessageSquare, Star, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

interface SquareFeedProps {
  records: WatermelonRecord[];
  onLike: (id: string) => void;
  onWhatsUp: (id: string) => void;
  onDisputePrice: (id: string) => void;
  localCity?: string;
}

export const SquareFeed: React.FC<SquareFeedProps> = ({ records, onLike, onWhatsUp, onDisputePrice, localCity }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'leaderboard' | 'local'>('all');
  const [showSecurityLab, setShowSecurityLab] = useState<boolean>(false);

  const localRecords = React.useMemo(() => {
    if (!localCity) return [];
    return records.filter(r => r.purchaseLocation && r.purchaseLocation.includes(localCity));
  }, [records, localCity]);

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

  // Sort / filter logic
  const sortedRecords = (() => {
    const source = activeTab === 'local' ? localRecords : records;
    return [...source].sort((a, b) => {
      if (activeTab === 'leaderboard') return b.overallScore - a.overallScore;
      return b.timestamp - a.timestamp;
    });
  })();

  return (
    <div className="w-full">
      {/* Tab Selectors */}
      <div className="flex bg-amber-50 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-emerald-950 mb-6 shadow-[2px_2px_0px_0px_#064e3b]">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-emerald-800 text-white shadow-[0px_3px_0px_0px_#042f24]'
              : 'text-emerald-950 hover:bg-emerald-100'
          }`}
        >
          <MessageSquare size={14} className="sm:w-4 sm:h-4" />
          最新瓜贴
        </button>
        {localCity && (
          <button
            onClick={() => setActiveTab('local')}
            className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
              activeTab === 'local'
                ? 'bg-sky-600 text-white shadow-[0px_3px_0px_0px_#0c4a6e]'
                : 'text-emerald-950 hover:bg-emerald-100'
            }`}
          >
            <MapPin size={14} className="sm:w-4 sm:h-4" />
            {localCity}瓜贴
          </button>
        )}
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'bg-rose-600 text-white shadow-[0px_3px_0px_0px_#9b1c1c]'
              : 'text-emerald-950 hover:bg-emerald-100'
          }`}
        >
          <Trophy size={14} className="sm:w-4 sm:h-4" />
          🏆 最强瓜贴
        </button>
      </div>

      {/* 🍉 吃瓜百问小课堂 */}
      <div className="bg-sky-50 border-2 border-emerald-950 rounded-2xl p-3.5 mb-6 shadow-[2px_2px_0px_0px_#064e3b]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-sky-950 flex items-center gap-1.5">
            <span>🍉</span> 吃瓜百问：你的瓜贴去哪儿了？
          </span>
          <button
            onClick={() => setShowSecurityLab(!showSecurityLab)}
            className="text-[10px] font-black text-sky-950 hover:text-sky-900 bg-white border-2 border-emerald-950 px-2 py-0.5 rounded-lg shadow-[1px_1px_0px_0px_#064e3b] transition-all active:translate-y-[1px]"
          >
            {showSecurityLab ? '收起来啦 🔼' : '点我看看 🔽'}
          </button>
        </div>

        {showSecurityLab && (
          <div className="mt-3 pt-3 border-t-2 border-dashed border-sky-950/10 space-y-3.5 text-[11px] leading-relaxed text-sky-900 font-sans">
            <div>
              <p className="font-extrabold text-sky-950">💾 Q1: 我的瓜贴关了网页还在吗？</p>
              <div className="pl-4 mt-1 text-sky-950/85 font-bold">
                <p>💡 <strong>在的！今天发的瓜贴，大家都看得见～</strong>你测过的瓜、晒过的贴都会同步到广场上，其他吃瓜群众也能看到你的分享。关掉网页再打开，瓜贴还在～</p>
                <p className="mt-1">💡 <strong>不过呢，每天凌晨 1:00 瓜田会焕新哦！</strong>就像不吃隔夜瓜一样，到了凌晨今天的瓜贴就会清清爽爽地清零，开启新一天的吃瓜冒险。趁新鲜赶紧晒～</p>
              </div>
            </div>

            <div className="border-t border-dashed border-sky-950/5 pt-3">
              <p className="font-extrabold text-sky-950">🛡️ Q2: 为什么发完帖要等一小会儿？</p>
              <div className="pl-4 mt-1 text-sky-950/85 font-bold">
                <p>💡 <strong>🧊 冰镇小憩，公平吃瓜～</strong>刚吃完一块瓜总要擦擦嘴嘛！发完一条瓜贴需要等 <strong>60 秒的冰镇小歇</strong>，这样广场上的每颗瓜都能被大家细细品尝，不会被一下刷走啦！</p>
                <p className="mt-1">💡 <strong>不用注册，来了就吃！</strong>不需要填手机号、不需要记密码，第一次来的时候就偷偷塞给你一张专属的<strong>【吃瓜通行证】</strong>（比如 <code>🍉 吃瓜群众_#5829</code>），悄悄保护你的小隐私～</p>
              </div>
            </div>

            <div className="border-t border-dashed border-sky-950/5 pt-3">
              <p className="font-extrabold text-sky-950">🕐 Q3: 凌晨 1:00 数据就没了，那不白发了？</p>
              <div className="pl-4 mt-1 text-sky-950/85 font-bold">
                <p>💡 <strong>不会白发的！</strong>虽然每日瓜贴会清空重置，但你贡献的 <strong>瓜价行情</strong> 会在凌晨存档到历史记录里。你上报的价格会变成瓜价走势图上的一个数据点，影响未来的行情指数～</p>
                <p className="mt-1">💡 <strong>每天都是新开始！</strong>就像真正的夏日吃瓜——昨天的瓜吃完了，今天再敲一个新鲜的。每天的瓜田都是崭新的一页，看谁今天能晒出最甜的梦中情瓜！🍉</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {sortedRecords.length === 0 ? (
        <div className="text-center py-12 bg-[#FFFDF5] rounded-3xl border-4 border-dashed border-emerald-900/30">
          <p className="text-emerald-950 font-bold text-lg mb-2">🍉 瓜田里还没有瓜瓜～</p>
          <p className="text-emerald-800/80 text-xs">快去拍拍瓜、测测甜度，做第一个晒瓜的小可爱吧！</p>
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
              className="relative bg-white border-2 sm:border-4 border-emerald-950 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200 shadow-[2px_2px_0px_0px_rgba(6,78,59,0.5)] sm:shadow-[4px_4px_0px_0px_#064e3b]"
            >
              {/* Leaderboard Rank Badge */}
              {activeTab === 'leaderboard' && (
                <div className="absolute -top-2 sm:-top-3 -left-2 sm:-left-3 w-8 h-8 sm:w-10 sm:h-10 bg-amber-400 border-2 sm:border-4 border-emerald-950 rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_#064e3b] z-10">
                  <span className="font-extrabold text-emerald-950 text-xs sm:text-sm">
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
                      {item.pricePerJin != null && (
                        <span className="text-[9.5px] text-amber-800 font-extrabold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 leading-none font-sans">
                          💴 ¥{item.pricePerJin}/斤
                        </span>
                      )}
                      {item.isSelfSplit && (
                        <span className="text-[9.5px] text-rose-800 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/60 leading-none font-sans">
                          🔪 自己劈的
                        </span>
                      )}
                    </div>
                  </div>

                  <span className={`shrink-0 text-[10.5px] font-bold px-2 py-0.5 rounded-full border-2 whitespace-nowrap ${getStatusColor(item.ripenessStatus)}`}>
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
                    甜熟度: {item.overallScore}分
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
                    拍声: {item.frequency}Hz
                  </div>
                  <div className="text-[10px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    花纹: {Math.round(item.stripeContrast * 100)}%
                  </div>
                </div>

                {/* Comments */}
                <p className="text-emerald-950 text-xs font-medium leading-relaxed bg-amber-50/50 p-2.5 rounded-xl border-2 border-dashed border-emerald-900/10 mb-4 italic">
                  " {item.message || '这位吃瓜群众太害羞了，什么都没写就溜走了～'} "
                </p>
              </div>

              {/* Interaction Footer */}
              <div className="flex items-center justify-between border-t border-emerald-900/10 pt-3 mt-1">
                <span className="text-[11px] font-bold text-emerald-800">
                  🍉 评分: <span className="text-rose-600 font-extrabold text-sm">{item.ratedStars}颗星</span>
                </span>

                <div className="flex items-center gap-1.5">
                  {item.pricePerJin != null && (
                    <button
                      onClick={() => onDisputePrice(item.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 border-2 border-slate-300 text-slate-500 font-extrabold text-[10px] rounded-xl transition-all active:scale-95 shadow-[1px_1px_0px_0px_#94a3b8]"
                      title="这价格不对！踩一下降低它在行情里的权重"
                    >
                      🙅 {item.priceDisputes || 0}
                    </button>
                  )}
                  <button
                    onClick={() => onWhatsUp(item.id)}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 border-2 border-amber-400 text-amber-700 font-extrabold text-[10px] rounded-xl transition-all active:scale-95 shadow-[1px_1px_0px_0px_#d97706]"
                  >
                    🤨 {item.whatsUp || 0}
                  </button>
                  <button
                    onClick={() => onLike(item.id)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 hover:bg-rose-100 border-2 border-rose-900 text-rose-700 hover:text-rose-800 font-extrabold text-xs rounded-xl transition-all duration-200 active:scale-95 shadow-[1.5px_1.5px_0px_0px_#9b1c1c]"
                >
                  <ThumbsUp size={12} className="fill-rose-100 hover:fill-rose-200" />
                  赞瓜度 {item.likes}
                </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
