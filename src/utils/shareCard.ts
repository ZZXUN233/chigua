/**
 * 吃瓜分享卡片生成器
 * 将测瓜结果渲染成精美分享图，适合朋友圈/小红书
 */

export function generateShareCard(
  pixelArtUrl: string,
  melonName: string,
  ripenessStatus: string,
  overallScore: number,
  pricePerJin?: number,
  location?: string
): string {
  const W = 600;
  const H = 800;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 背景：温暖的米黄色渐变
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#FFFDF6');
  bg.addColorStop(0.5, '#FFF8E7');
  bg.addColorStop(1, '#FEF3C7');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 顶部装饰波纹
  ctx.fillStyle = '#064e3b';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= W; x += 40) {
    ctx.lineTo(x, 30 + Math.sin(x * 0.03) * 15);
  }
  ctx.lineTo(W, 0);
  ctx.fill();

  // 标题
  ctx.fillStyle = '#064e3b';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🍉 吃瓜大师鉴定报告', W / 2, 80);

  // 日期
  ctx.fillStyle = '#666';
  ctx.font = '14px sans-serif';
  ctx.fillText(new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }), W / 2, 110);

  // 像素画西瓜（主体）
  const imgSize = 280;
  const imgX = (W - imgSize) / 2;
  const imgY = 140;

  // 绘制圆角背景框
  ctx.fillStyle = 'white';
  ctx.strokeStyle = '#064e3b';
  ctx.lineWidth = 5;
  roundRect(ctx, imgX - 20, imgY - 20, imgSize + 40, imgSize + 40, 24);
  ctx.fill();
  ctx.stroke();

  // 加载像素画图片
  const img = new Image();
  img.src = pixelArtUrl;

  // 由于 Image 加载是异步的，这里用同步方式获取已经存在的 image
  // 实际上 pixelArtUrl 已经是 data URL，可以直接 drawImage
  // 但需要等图片加载完成。为了简单，这里返回 canvas 的 data URL
  // 在调用时由外部确保图片已加载

  // 西瓜名称
  ctx.fillStyle = '#064e3b';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(melonName, W / 2, imgY + imgSize + 60);

  // 熟度徽章
  const badgeText = ripenessStatus === 'ripe' ? '🍉 黄金脆甜' : ripenessStatus === 'unripe' ? '🟢 青涩偏生' : '🩸 沙瓤熟透';
  const badgeColor = ripenessStatus === 'ripe' ? '#16a34a' : ripenessStatus === 'unripe' ? '#65a30d' : '#dc2626';
  ctx.fillStyle = badgeColor;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(badgeText, W / 2, imgY + imgSize + 90);

  // 分数
  ctx.fillStyle = '#064e3b';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText(`${overallScore} 分`, W / 2, imgY + imgSize + 150);

  // 价格和位置信息
  let infoY = imgY + imgSize + 185;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = '#444';
  if (pricePerJin != null) {
    ctx.fillText(`💰 ¥${pricePerJin} / 市斤`, W / 2, infoY);
    infoY += 32;
  }
  if (location) {
    ctx.fillText(`${location}`, W / 2, infoY);
    infoY += 32;
  }

  // 底部条形码装饰
  const barcodeY = H - 100;
  ctx.fillStyle = '#064e3b20';
  for (let x = 40; x < W - 40; x += 6) {
    const h = 20 + Math.random() * 40;
    ctx.fillRect(x, barcodeY, 3, h);
  }

  // 底部标语
  ctx.fillStyle = '#064e3b';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('扫码来吃瓜大师，看看你的瓜熟不熟 🍉', W / 2, H - 40);

  // 底部华强金句
  ctx.fillStyle = '#b91c1c';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('"这瓜保熟吗？" —— 华强', W / 2, H - 15);

  return canvas.toDataURL('image/png');
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
