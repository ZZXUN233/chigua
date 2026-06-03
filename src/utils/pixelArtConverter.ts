/**
 * Pixel Art Watermelon Converter
 * Converts a webcam-captured photo into a cute pixel-art watermelon
 * with quantized colors and an emoji-style face overlay.
 */

import { WatermelonStatus } from '../types';

// Watermelon-themed color palette (12 colors for quantization)
const PALETTE: { r: number; g: number; b: number }[] = [
  { r: 0x1B, g: 0x5E, b: 0x20 }, // dark green (rind)
  { r: 0x2E, g: 0x7D, b: 0x32 }, // medium green (stripe)
  { r: 0x66, g: 0xBB, b: 0x6A }, // bright green (skin)
  { r: 0xC8, g: 0xE6, b: 0xC9 }, // pale green (unripe base)
  { r: 0xE8, g: 0xF5, b: 0xE9 }, // whitish green (unripe highlight)
  { r: 0xE5, g: 0x39, b: 0x35 }, // red (ripe flesh)
  { r: 0xF4, g: 0x8F, b: 0xB1 }, // pink (blush)
  { r: 0xFD, g: 0xD8, b: 0x35 }, // gold (ripe spot)
  { r: 0x00, g: 0x4D, b: 0x40 }, // dark teal (ripe stripe)
  { r: 0xFF, g: 0xFF, b: 0xFF }, // white
  { r: 0xEE, g: 0xEE, b: 0xEE }, // light gray
  { r: 0x33, g: 0x33, b: 0x33 }, // near-black (outline/shadow)
];

// Find closest palette color by Euclidean distance
function closestColor(r: number, g: number, b: number): { r: number; g: number; b: number } {
  let minDist = Infinity;
  let best = PALETTE[0];
  for (const p of PALETTE) {
    const dr = r - p.r;
    const dg = g - p.g;
    const db = b - p.b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDist) {
      minDist = dist;
      best = p;
    }
  }
  return best;
}

// Draw a pixel-art face overlay on the 32x32 grid
function drawPixelFace(
  pixels: Uint8ClampedArray,
  width: number,
  status: WatermelonStatus
) {
  const setPixel = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || x >= width || y < 0 || y >= width) return;
    const idx = (y * width + x) * 4;
    pixels[idx] = r;
    pixels[idx + 1] = g;
    pixels[idx + 2] = b;
    pixels[idx + 3] = 255;
  };

  const BLK = { r: 0x33, g: 0x33, b: 0x33 };
  const WHT = { r: 0xFF, g: 0xFF, b: 0xFF };
  const PNK = { r: 0xF4, g: 0x8F, b: 0xB1 };
  const RED = { r: 0xE5, g: 0x39, b: 0x35 };

  if (status === 'ripe') {
    // Happy face: ^^ eyes, small smile, pink blush
    // Left eye ^
    setPixel(11, 12, BLK.r, BLK.g, BLK.b);
    setPixel(12, 11, BLK.r, BLK.g, BLK.b);
    setPixel(13, 11, BLK.r, BLK.g, BLK.b);
    setPixel(14, 12, BLK.r, BLK.g, BLK.b);
    // Right eye ^
    setPixel(17, 12, BLK.r, BLK.g, BLK.b);
    setPixel(18, 11, BLK.r, BLK.g, BLK.b);
    setPixel(19, 11, BLK.r, BLK.g, BLK.b);
    setPixel(20, 12, BLK.r, BLK.g, BLK.b);
    // Smile
    setPixel(13, 17, BLK.r, BLK.g, BLK.b);
    setPixel(14, 18, BLK.r, BLK.g, BLK.b);
    setPixel(15, 18, BLK.r, BLK.g, BLK.b);
    setPixel(16, 18, BLK.r, BLK.g, BLK.b);
    setPixel(17, 18, BLK.r, BLK.g, BLK.b);
    setPixel(18, 17, BLK.r, BLK.g, BLK.b);
    // Blush
    setPixel(9, 14, PNK.r, PNK.g, PNK.b);
    setPixel(10, 15, PNK.r, PNK.g, PNK.b);
    setPixel(21, 14, PNK.r, PNK.g, PNK.b);
    setPixel(22, 15, PNK.r, PNK.g, PNK.b);
  } else if (status === 'unripe') {
    // Sleepy face: dot eyes, small o mouth
    setPixel(12, 13, BLK.r, BLK.g, BLK.b);
    setPixel(13, 13, BLK.r, BLK.g, BLK.b);
    setPixel(18, 13, BLK.r, BLK.g, BLK.b);
    setPixel(19, 13, BLK.r, BLK.g, BLK.b);
    // o mouth
    setPixel(14, 18, BLK.r, BLK.g, BLK.b);
    setPixel(15, 18, BLK.r, BLK.g, BLK.b);
    setPixel(16, 18, BLK.r, BLK.g, BLK.b);
    setPixel(17, 18, BLK.r, BLK.g, BLK.b);
    setPixel(14, 19, BLK.r, BLK.g, BLK.b);
    setPixel(17, 19, BLK.r, BLK.g, BLK.b);
    setPixel(15, 20, BLK.r, BLK.g, BLK.b);
    setPixel(16, 20, BLK.r, BLK.g, BLK.b);
  } else {
    // overripe - Dizzy face: X eyes, wavy mouth
    // X left eye
    setPixel(11, 11, BLK.r, BLK.g, BLK.b);
    setPixel(12, 12, BLK.r, BLK.g, BLK.b);
    setPixel(13, 13, BLK.r, BLK.g, BLK.b);
    setPixel(11, 13, BLK.r, BLK.g, BLK.b);
    setPixel(13, 11, BLK.r, BLK.g, BLK.b);
    // X right eye
    setPixel(18, 11, BLK.r, BLK.g, BLK.b);
    setPixel(19, 12, BLK.r, BLK.g, BLK.b);
    setPixel(20, 13, BLK.r, BLK.g, BLK.b);
    setPixel(18, 13, BLK.r, BLK.g, BLK.b);
    setPixel(20, 11, BLK.r, BLK.g, BLK.b);
    // Wavy mouth
    setPixel(12, 17, BLK.r, BLK.g, BLK.b);
    setPixel(13, 18, BLK.r, BLK.g, BLK.b);
    setPixel(14, 17, BLK.r, BLK.g, BLK.b);
    setPixel(15, 18, BLK.r, BLK.g, BLK.b);
    setPixel(16, 17, BLK.r, BLK.g, BLK.b);
    setPixel(17, 18, BLK.r, BLK.g, BLK.b);
    setPixel(18, 17, BLK.r, BLK.g, BLK.b);
    setPixel(19, 18, BLK.r, BLK.g, BLK.b);
    // Tongue
    setPixel(14, 19, RED.r, RED.g, RED.b);
    setPixel(15, 19, RED.r, RED.g, RED.b);
    setPixel(16, 19, RED.r, RED.g, RED.b);
  }
}

/**
 * Convert a photo (or any canvas image source) into a cute pixel-art watermelon.
 * Returns a base64 PNG data URL of the pixel art at display size (256x256).
 * The underlying pixel grid is 32x32, upscaled with nearest-neighbor for crisp edges.
 */
export function convertToPixelArt(
  source: CanvasImageSource,
  status: WatermelonStatus
): string {
  const GRID = 32;
  const DISPLAY = 256;

  // Step 1: Downsample to 32x32 tiny grid
  const tinyCanvas = document.createElement('canvas');
  tinyCanvas.width = GRID;
  tinyCanvas.height = GRID;
  const tinyCtx = tinyCanvas.getContext('2d')!;
  tinyCtx.drawImage(source, 0, 0, GRID, GRID);

  // Step 2: Read pixels and quantize to watermelon palette
  const imageData = tinyCtx.getImageData(0, 0, GRID, GRID);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    // Skip fully transparent pixels
    if (pixels[i + 3] < 128) continue;
    const closest = closestColor(r, g, b);
    pixels[i] = closest.r;
    pixels[i + 1] = closest.g;
    pixels[i + 2] = closest.b;
  }

  // Step 3: Draw pixel-art face overlay
  drawPixelFace(pixels, GRID, status);

  // Put quantized + face pixels back onto tiny canvas
  tinyCtx.putImageData(imageData, 0, 0);

  // Step 4: Scale up to display size with crisp pixel edges
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = DISPLAY;
  displayCanvas.height = DISPLAY;
  const displayCtx = displayCanvas.getContext('2d')!;
  displayCtx.imageSmoothingEnabled = false;
  displayCtx.drawImage(tinyCanvas, 0, 0, DISPLAY, DISPLAY);

  // Step 5: Add a subtle rounded border for the sticker/card feel
  displayCtx.strokeStyle = '#1B5E20';
  displayCtx.lineWidth = 4;
  displayCtx.strokeRect(2, 2, DISPLAY - 4, DISPLAY - 4);

  return displayCanvas.toDataURL('image/png');
}
