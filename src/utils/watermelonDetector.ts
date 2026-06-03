/**
 * 纯前端西瓜检测器 — 基于 Canvas 像素分析
 *
 * 三个维度判断画面中是否有西瓜：
 * 1. 圆形度：绿色像素是否聚集在近似圆形区域内
 * 2. 绿度中心性：中心区域绿色浓度是否高于边缘
 * 3. 条纹特征：是否存在明暗交替的条纹（西瓜皮特征）
 *
 * 返回 0-100 的置信度分数
 */

export interface DetectionResult {
  hasWatermelon: boolean;
  confidence: 'high' | 'medium' | 'low';
  score: number;         // 0-100
  description: string;
}

/**
 * 从 Canvas 检测是否存在西瓜
 */
export function detectWatermelonFromCanvas(canvas: HTMLCanvasElement): DetectionResult {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { hasWatermelon: true, confidence: 'low', score: 0, description: '无法读取画面' };

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.38; // 检测半径（画面 38%）

  const imageData = ctx.getImageData(0, 0, w, h);
  const pixels = imageData.data;

  // ---- 指标 1: 圆形绿色区域检测 ----
  let centerGreenCount = 0;
  let edgeGreenCount = 0;
  let centerTotal = 0;
  let edgeTotal = 0;

  // 逐像素采样（步长 4 加速）
  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < w; x += 4) {
      const idx = (y * w + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      // 判断是否为"绿色"像素（g 显著高于 r 和 b）
      const isGreen = g > r * 1.15 && g > b * 1.1 && g > 60;

      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < radius) {
        centerTotal++;
        if (isGreen) centerGreenCount++;
      } else if (dist < radius * 1.5) {
        edgeTotal++;
        if (isGreen) edgeGreenCount++;
      }
    }
  }

  const centerGreenRatio = centerTotal > 0 ? centerGreenCount / centerTotal : 0;
  const edgeGreenRatio = edgeTotal > 0 ? edgeGreenCount / edgeTotal : 0;
  const greenConcentration = centerGreenRatio - edgeGreenRatio; // 中心越绿越像瓜

  // ---- 指标 2: 条纹分析（水平方向明暗交替） ----
  let stripeScore = 0;
  const sampleY = Math.floor(cy);
  const rowStart = Math.floor(cx - radius);
  const rowEnd = Math.floor(cx + radius);

  if (rowEnd > rowStart) {
    const rowGreens: number[] = [];
    for (let x = rowStart; x < rowEnd; x += 3) {
      const idx = (sampleY * w + x) * 4;
      rowGreens.push(pixels[idx + 1]); // green channel
    }

    // 数绿色通道穿越均值的次数 → 条纹数量
    if (rowGreens.length > 10) {
      const avg = rowGreens.reduce((a, b) => a + b, 0) / rowGreens.length;
      let crossings = 0;
      let above = rowGreens[0] > avg;
      for (let i = 1; i < rowGreens.length; i++) {
        const nowAbove = rowGreens[i] > avg;
        if (nowAbove !== above) {
          crossings++;
          above = nowAbove;
        }
      }
      // 西瓜通常有 4-12 条深色条纹 → 在水平线上穿越 4-12 次
      if (crossings >= 3 && crossings <= 16) {
        stripeScore = Math.min(100, crossings * 12);
      } else if (crossings > 16) {
        stripeScore = 30; // 太多条纹 → 可能是纹理噪声
      }
    }
  }

  // ---- 综合评分 ----
  // 中心绿色浓度权重 50%，绿色对比度 20%，条纹 30%
  const greenScore = Math.min(100, Math.max(0, greenConcentration * 200 + 20));
  const contrastScore = Math.min(100, centerGreenRatio * 100);
  const finalScore = Math.round(greenScore * 0.5 + contrastScore * 0.2 + stripeScore * 0.3);

  // ---- 判定 ----
  const hasWatermelon = finalScore >= 40;
  const confidence: DetectionResult['confidence'] =
    finalScore >= 65 ? 'high' : finalScore >= 40 ? 'medium' : 'low';

  // 生成描述
  let description: string;
  if (centerGreenRatio < 0.08) {
    description = '画面中绿色很少，可能没对准瓜';
  } else if (finalScore >= 65) {
    description = '看到一个圆圆绿绿的大西瓜！';
  } else if (finalScore >= 40) {
    description = '好像有个绿色的圆圆的东西～';
  } else if (greenConcentration < 0.04) {
    description = '绿色不够集中，再靠近一点？';
  } else {
    description = '不太确定是不是西瓜诶～';
  }

  return { hasWatermelon, confidence, score: finalScore, description };
}
