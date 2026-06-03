import React from 'react';
import { PricePoint } from '../types';

interface PriceChartProps {
  data: PricePoint[];
}

/**
 * 迷你瓜价走势图 — SVG 实现，零依赖
 * 类似 K 线图风格，展示每日均价波动
 */
export const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  const valid = data.filter(p => p.avgPrice != null);
  if (valid.length < 2) return null;

  const W = 320;
  const H = 80;
  const PAD_L = 32;
  const PAD_R = 12;
  const PAD_T = 10;
  const PAD_B = 18;

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const prices = valid.map(p => p.avgPrice!);
  const minP = Math.floor(Math.min(...prices) * 0.9 * 10) / 10;
  const maxP = Math.ceil(Math.max(...prices) * 1.1 * 10) / 10;
  const range = maxP - minP || 1;

  const xScale = (i: number) => PAD_L + (i / (valid.length - 1)) * plotW;
  const yScale = (p: number) => PAD_T + plotH - ((p - minP) / range) * plotH;

  // Build line path
  const lineD = valid
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(p.avgPrice!).toFixed(1)}`)
    .join(' ');

  // Build filled area path
  const areaD = lineD
    + ` L ${xScale(valid.length - 1).toFixed(1)} ${(PAD_T + plotH).toFixed(1)}`
    + ` L ${xScale(0).toFixed(1)} ${(PAD_T + plotH).toFixed(1)} Z`;

  // Determine trend color
  const firstPrice = valid[0].avgPrice!;
  const lastPrice = valid[valid.length - 1].avgPrice!;
  const trendUp = lastPrice >= firstPrice;
  const lineColor = trendUp ? '#16a34a' : '#dc2626';
  const areaColor = trendUp ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.10)';

  // Y-axis labels (2 ticks)
  const yTicks = [minP, maxP];

  // X-axis labels: show first, middle, last date
  const xLabels = [
    { i: 0, date: valid[0].date },
    { i: valid.length - 1, date: valid[valid.length - 1].date },
  ];
  if (valid.length >= 5) {
    const mid = Math.floor(valid.length / 2);
    xLabels.splice(1, 0, { i: mid, date: valid[mid].date });
  }

  const fmtDate = (d: string) => {
    const parts = d.split('-');
    return `${parts[1]}/${parts[2]}`;
  };

  return (
    <div className="bg-white border-2 border-emerald-950 rounded-xl p-3 overflow-hidden">
      <p className="text-[10px] font-black text-emerald-950 mb-1 flex items-center gap-1.5">
        📈 瓜价走势
        <span className={`text-[9px] font-bold ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
          {trendUp ? '📈 涨势喜瓜' : '📉 跌跌不休'}
        </span>
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        style={{ maxHeight: 100 }}
      >
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={`tick-${i}`}>
            <line
              x1={PAD_L} y1={yScale(tick).toFixed(1)}
              x2={W - PAD_R} y2={yScale(tick).toFixed(1)}
              stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3 2"
            />
            <text
              x={PAD_L - 4} y={yScale(tick).toFixed(1)}
              textAnchor="end" dominantBaseline="middle"
              className="text-[7px] fill-emerald-700 font-bold"
              style={{ fontFamily: 'monospace' }}
            >
              ¥{tick}
            </text>
          </g>
        ))}

        {/* Filled area */}
        <path d={areaD} fill={areaColor} />

        {/* Price line */}
        <path d={lineD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data dots */}
        {valid.map((p, i) => (
          <circle
            key={p.date}
            cx={xScale(i).toFixed(1)}
            cy={yScale(p.avgPrice!).toFixed(1)}
            r={valid.length > 10 ? 2 : 3}
            fill="white"
            stroke={lineColor}
            strokeWidth="1.5"
          />
        ))}

        {/* X-axis labels */}
        {xLabels.map(({ i, date }) => (
          <text
            key={date}
            x={xScale(i).toFixed(1)}
            y={H - 3}
            textAnchor="middle"
            className="text-[6.5px] fill-emerald-600 font-bold"
            style={{ fontFamily: 'monospace' }}
          >
            {fmtDate(date)}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-between mt-1 text-[8px] text-emerald-600 font-medium">
        <span>¥{firstPrice}</span>
        <span className={trendUp ? 'text-green-600' : 'text-red-500'}>
          {trendUp ? '+' : ''}{((lastPrice - firstPrice) / firstPrice * 100).toFixed(1)}%
        </span>
        <span>¥{lastPrice}</span>
      </div>
    </div>
  );
};
