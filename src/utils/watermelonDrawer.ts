/**
 * Draw lovely cartoonish watermelons procedurally inside an HTML Canvas
 * and return as a Base64 image URL. Used for both simulator, community cards,
 * and analysis visuals!
 */

import { WatermelonStatus } from '../types';

export function drawWatermelonToCanvas(
  canvas: HTMLCanvasElement,
  status: WatermelonStatus,
  options: {
    showFace?: boolean;
    nameTag?: string;
  } = {}
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.38;

  const { showFace = true, nameTag = '' } = options;

  // Clear canvas
  ctx.clearRect(0, 0, w, h);

  // Define colors based on status
  let bgColor = '#A5D6A7'; // bright green bg
  let stripeColor = '#1B5E20'; // dark green stripe
  let spotColor: string | null = null;
  let eyeType: 'happy' | 'sleepy' | 'dizzy' = 'happy';
  let blush = '#FF8A80';

  if (status === 'unripe') {
    bgColor = '#E8F5E9'; // very pale whitish green
    stripeColor = '#81C784'; // low contrast light stripes
    spotColor = 'rgba(255, 255, 224, 0.5)'; // pale whitish-yellow
    eyeType = 'sleepy';
  } else if (status === 'ripe') {
    bgColor = '#66BB6A'; // vivid summer emerald green
    stripeColor = '#004D40'; // stark contrast deep dark teal green
    spotColor = '#FFE082'; // sunny ripe gold yellow
    eyeType = 'happy';
  } else {
    // overripe
    bgColor = '#4CAF50'; // dull dark green
    stripeColor = '#212121'; // thick dark charcoal stripes
    spotColor = '#FFB300'; // dark orange-yellow mud spot
    eyeType = 'dizzy';
  }

  // Draw Shadow
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.95, r * 0.8, r * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.fill();

  // Draw Watermelon Body (Slightly oval-shaped like typical watermelons)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.05, r * 0.95, 0, 0, Math.PI * 2);
  ctx.clip();

  // Draw base green skin
  ctx.fillStyle = bgColor;
  ctx.fill();

  // Draw Field Spot (Sun yellow patch representation)
  if (spotColor) {
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.4, cy + r * 0.2, r * 0.5, r * 0.4, Math.PI / 6, 0, Math.PI * 2);
    ctx.fillStyle = spotColor;
    ctx.fill();
    
    // Blur effect for spot
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.4, cy + r * 0.2, r * 0.4, r * 0.3, Math.PI / 6, 0, Math.PI * 2);
    ctx.fillStyle = spotColor;
    ctx.fill();
  }

  // Draw Stripes (Wavy, cute cartoonish curves)
  ctx.strokeStyle = stripeColor;
  ctx.lineWidth = Math.round(r * 0.1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw 5 vertical wavy stripes
  const drawStripe = (offsetX: number) => {
    ctx.beginPath();
    let startY = cy - r * 0.95;
    let endY = cy + r * 0.95;
    
    ctx.moveTo(cx + offsetX, startY);
    // Draw wavy spline
    const segments = 10;
    const step = (endY - startY) / segments;
    for (let i = 1; i <= segments; i++) {
      const curY = startY + i * step;
      // Wavy sine oscillation
      const ampl = r * 0.08 * Math.sin((i / segments) * Math.PI);
      const waveX = Math.sin(i * 1.5 + offsetX) * ampl;
      
      // Push slightly outward on sides
      const sideFactor = offsetX / r; // -1 to +1
      const bulgX = Math.sin((i / segments) * Math.PI) * sideFactor * r * 0.15;

      ctx.lineTo(cx + offsetX + waveX + bulgX, curY);
    }
    ctx.stroke();
  };

  drawStripe(0);
  drawStripe(-r * 0.35);
  drawStripe(r * 0.35);
  drawStripe(-r * 0.7);
  drawStripe(r * 0.7);

  ctx.restore();

  // Outline for watermelon to make it pop! (Cartoon style)
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.05, r * 0.95, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#064E3B'; // Deep jungle green outline
  ctx.lineWidth = 6;
  ctx.stroke();

  // Draw Cute face
  if (showFace) {
    ctx.save();
    
    // Eye positions
    const elX = cx - r * 0.3;
    const erX = cx + r * 0.3;
    const eyeY = cy - r * 0.1;

    // Draw Blush
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.arc(elX - r * 0.15, eyeY + r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(erX + r * 0.15, eyeY + r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.strokeStyle = '#064E3B';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    if (eyeType === 'sleepy') {
      // Sleepy horizontal happy curves (closed squinting)
      ctx.beginPath();
      ctx.arc(elX, eyeY, r * 0.08, Math.PI, 0, false);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(erX, eyeY, r * 0.08, Math.PI, 0, false);
      ctx.stroke();
    } else if (eyeType === 'happy') {
      // Big sparkling happy eyes with white reflections
      ctx.fillStyle = '#064E3B';
      ctx.beginPath();
      ctx.arc(elX, eyeY, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.arc(erX, eyeY, r * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle spots
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(elX - r * 0.03, eyeY - r * 0.03, r * 0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(erX - r * 0.03, eyeY - r * 0.03, r * 0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(elX + r * 0.03, eyeY + r * 0.03, r * 0.02, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(erX + r * 0.03, eyeY + r * 0.03, r * 0.02, 0, Math.PI * 2);
      ctx.fill();
    } else if (eyeType === 'dizzy') {
      // Spiral or X eyes
      const exRadius = r * 0.07;
      // Draw X for left eye
      ctx.beginPath();
      ctx.moveTo(elX - exRadius, eyeY - exRadius);
      ctx.lineTo(elX + exRadius, eyeY + exRadius);
      ctx.moveTo(elX + exRadius, eyeY - exRadius);
      ctx.lineTo(elX - exRadius, eyeY + exRadius);
      ctx.stroke();

      // Draw X for right eye
      ctx.beginPath();
      ctx.moveTo(erX - exRadius, eyeY - exRadius);
      ctx.lineTo(erX + exRadius, eyeY + exRadius);
      ctx.moveTo(erX + exRadius, eyeY - exRadius);
      ctx.lineTo(erX - exRadius, eyeY + exRadius);
      ctx.stroke();
    }

    // Mouth
    ctx.fillStyle = '#C62828'; // Deep watermelon pink
    ctx.strokeStyle = '#064E3B';
    ctx.lineWidth = 5;

    if (eyeType === 'sleepy') {
      // Cute small 'O'
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.15, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (eyeType === 'happy') {
      // Wide open happy smile with tongue
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.1, r * 0.15, 0, Math.PI, false); // bottom lip
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cute tongue
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.12, r * 0.15, 0, Math.PI, false);
      ctx.clip();

      ctx.fillStyle = '#FF8A80'; // pale tongue color
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.22, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (eyeType === 'dizzy') {
      // Wavy crooked line
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.15, cy + r * 0.15);
      ctx.bezierCurveTo(
        cx - r * 0.07, cy + r * 0.1, 
        cx + r * 0.07, cy + r * 0.2, 
        cx + r * 0.15, cy + r * 0.15
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  // Draw name tag if dynamic
  if (nameTag) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // Draw a cute wood-style or green ribbon banner below
    const textW = ctx.measureText(nameTag).width;
    const bw = Math.max(textW + 30, 100);
    const bh = 28;
    const bx = cx - bw / 2;
    const by = cy + r - 10;

    ctx.fillStyle = '#FFFDE7'; // pale yellow tag
    ctx.strokeStyle = '#064E3B';
    ctx.lineWidth = 3;
    
    // Draw bubble rectangle
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.fillStyle = '#064E3B';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nameTag, cx, by + bh / 2 + 1);
    ctx.restore();
  }
}

/**
 * Returns a base64 encoded image URL representing a procedural cartoon watermelon
 */
export function getWatermelonImageURL(status: WatermelonStatus, nameTag: string = ''): string {
  // Create solid offscreen canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 400;
  tempCanvas.height = 400;
  drawWatermelonToCanvas(tempCanvas, status, { showFace: true, nameTag });
  return tempCanvas.toDataURL('image/png');
}
export function getSlicedWatermelonImageURL(): string {
  // Create a slice emoji or drawing
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 120;
  tempCanvas.height = 120;
  const ctx = tempCanvas.getContext('2d');
  if (ctx) {
    // Draw a cute watermelon slice
    ctx.translate(60, 60);
    ctx.rotate(Math.PI / 4);
    
    // Outer green rind
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, Math.PI);
    ctx.fillStyle = '#1B5E20';
    ctx.fill();

    // Inner pale rind
    ctx.beginPath();
    ctx.arc(0, 0, 41, 0, Math.PI);
    ctx.fillStyle = '#E8F5E9';
    ctx.fill();

    // Red flesh
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI);
    ctx.fillStyle = '#E53935';
    ctx.fill();

    // Flat top lid
    ctx.fillStyle = '#E53935';
    ctx.fillRect(-36, -1, 72, 4);

    // Seeds
    ctx.fillStyle = '#212121';
    const seeds = [
      {x: -15, y: 12}, {x: 15, y: 12}, {x: 0, y: 22},
      {x: -22, y: 8}, {x: 22, y: 8}, {x: -8, y: 18}, {x: 8, y: 18}
    ];
    seeds.forEach(s => {
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 2, 3.5, Math.PI/12, 0, Math.PI*2);
      ctx.fill();
    });
  }
  return tempCanvas.toDataURL('image/png');
}
