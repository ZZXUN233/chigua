import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
  isListening: boolean;
  themeColor: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  analyser,
  isListening,
  themeColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;

      // Clear or paint semitransparent background for visual tail effect
      ctx.fillStyle = 'rgba(255, 253, 245, 0.15)'; 
      ctx.fillRect(0, 0, width, height);

      if (isListening && analyser) {
        // Draw real-time mic wave
        analyser.getByteTimeDomainData(dataArray);

        ctx.lineWidth = 4;
        ctx.strokeStyle = themeColor;
        ctx.lineCap = 'round';
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0; // range 0 to 2
          const y = v * (height / 2);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Draw overlay sparkling particles on loud amplitude
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += Math.abs(dataArray[i] - 128);
        }
        const avgAmplitude = total / bufferLength;

        if (avgAmplitude > 5) {
          ctx.beginPath();
          ctx.arc(width / 2 + (Math.random() - 0.5) * 80, height / 2 + (Math.random() - 0.5) * 30, avgAmplitude * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(239, 83, 80, 0.4)'; // watermlon pink glow
          ctx.fill();
        }
      } else {
        // Draw a simulated idle waving sine wave (cute cartoon vibe)
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#CBD5E1'; // soft grey wave
        ctx.lineCap = 'round';

        const points: {x: number, y: number}[] = [];
        const time = Date.now() * 0.004;
        for (let x = 0; x <= width; x += 4) {
          const y = height / 2 + Math.sin(x * 0.03 + time) * 8 * Math.sin(x * 0.005);
          points.push({x, y});
        }

        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();

        // Draw some little sleeping bubbles zZZ
        if (Date.now() % 3000 < 1000) {
          ctx.fillStyle = '#94A3B8';
          ctx.font = 'bold 11px system-ui';
          ctx.fillText('zZZ', width - 40, height / 2 - 10);
        }
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isListening, themeColor]);

  return (
    <div className="relative w-full h-16 bg-[#FFFDF5] rounded-xl border-2 border-emerald-900 overflow-hidden shadow-inner flex items-center">
      <canvas
        ref={canvasRef}
        width={360}
        height={64}
        className="w-full h-full block"
      />
      <div className="absolute top-2 right-2 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-200">
        {isListening ? '🎙️ 实测麦克风' : '💤 待机中'}
      </div>
    </div>
  );
};
