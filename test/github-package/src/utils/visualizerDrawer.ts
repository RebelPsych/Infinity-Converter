import { VisualizerPreset, VideoTheme } from '../types';

export interface VisualizerRenderOptions {
  preset: VisualizerPreset;
  theme: VideoTheme;
  title?: string;
  artist?: string;
  artworkImg?: HTMLImageElement | null;
  time: number;
}

export function drawVisualizerOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frequencyData: Uint8Array,
  timeDomainData: Uint8Array,
  options: VisualizerRenderOptions
) {
  const isDark = options.theme === 'dark';
  const bgColor = isDark ? '#050505' : '#FFFFFF';
  const fgColor = isDark ? '#FFFFFF' : '#000000';
  const mutedColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
  const hairlineColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';

  // 1. Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw subtle geometric background grid
  ctx.strokeStyle = hairlineColor;
  ctx.lineWidth = 1;
  const gridSize = Math.min(width, height) / 16;
  ctx.beginPath();
  for (let x = 0; x < width; x += gridSize * 2) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y < height; y += gridSize * 2) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // Calculate audio energy
  let sum = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    sum += frequencyData[i];
  }
  const avgEnergy = sum / (frequencyData.length || 1);
  const energyNorm = Math.min(1, avgEnergy / 128);

  const centerX = width / 2;
  const centerY = height / 2;

  // 3. Render specific visualizer
  if (options.preset === 'infinity') {
    // Dynamic Resonant Infinity Loop (Lemniscate of Bernoulli / Lissajous ∞)
    ctx.save();
    ctx.translate(centerX, centerY);

    const baseRadius = Math.min(width, height) * 0.28;
    const pulse = 1 + energyNorm * 0.35;
    const a = baseRadius * pulse;

    // Draw multiple layered harmonic infinity curves
    const layers = [
      { alpha: 0.15, lw: 8, scale: 1.05 },
      { alpha: 0.35, lw: 4, scale: 1.0 },
      { alpha: 1.0, lw: 2.2, scale: 0.98 },
    ];

    for (const layer of layers) {
      ctx.beginPath();
      ctx.strokeStyle = isDark
        ? `rgba(255, 255, 255, ${layer.alpha})`
        : `rgba(0, 0, 0, ${layer.alpha})`;
      ctx.lineWidth = layer.lw;

      const numPoints = 200;
      for (let i = 0; i <= numPoints; i++) {
        const t = (i / numPoints) * Math.PI * 2;
        const sampleIndex = Math.floor((i / numPoints) * timeDomainData.length);
        const waveOffset = ((timeDomainData[sampleIndex] - 128) / 128) * (20 * energyNorm);

        // Lemniscate formula: x = a*cos(t)/(1+sin(t)^2), y = a*sin(t)*cos(t)/(1+sin(t)^2)
        const denom = 1 + Math.sin(t) * Math.sin(t);
        const curA = a * layer.scale + waveOffset;
        const x = (curA * Math.cos(t)) / denom;
        const y = (curA * Math.sin(t) * Math.cos(t)) / denom;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Core central resonance dot
    ctx.beginPath();
    ctx.arc(0, 0, 4 + energyNorm * 6, 0, Math.PI * 2);
    ctx.fillStyle = fgColor;
    ctx.fill();

    ctx.restore();
  } else if (options.preset === 'spectrum') {
    // High-Contrast Minimalist Spectrum Bars
    const barCount = 48;
    const margin = width * 0.1;
    const availableWidth = width - margin * 2;
    const barWidth = (availableWidth / barCount) * 0.7;
    const barSpacing = (availableWidth / barCount) * 0.3;
    const maxHeight = height * 0.45;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * (frequencyData.length * 0.7));
      const val = frequencyData[dataIndex] || 0;
      const barHeight = Math.max(3, (val / 255) * maxHeight);

      const x = margin + i * (barWidth + barSpacing);
      const y = centerY - barHeight / 2;

      ctx.fillStyle = fgColor;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Mirror reflection hairline
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(x, centerY + barHeight / 2 + 6, barWidth, Math.min(20, barHeight * 0.25));
    }
  } else if (options.preset === 'circular') {
    // Concentric Radial Sound Orbit
    ctx.save();
    ctx.translate(centerX, centerY);

    const radius = Math.min(width, height) * 0.25;
    const rings = 3;

    for (let r = 0; r < rings; r++) {
      const ringRadius = radius * (0.6 + r * 0.3);
      ctx.beginPath();
      ctx.strokeStyle = isDark
        ? `rgba(255, 255, 255, ${0.3 + r * 0.35})`
        : `rgba(0, 0, 0, ${0.25 + r * 0.35})`;
      ctx.lineWidth = 1.5 + r;

      const segments = 120;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const dataIdx = Math.floor((i / segments) * frequencyData.length);
        const amp = ((frequencyData[dataIdx] || 0) / 255) * 35 * (r + 1);
        const curR = ringRadius + amp;

        const x = curR * Math.cos(theta);
        const y = curR * Math.sin(theta);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  } else {
    // Oscilloscope Precision Waveform Line
    ctx.beginPath();
    ctx.strokeStyle = fgColor;
    ctx.lineWidth = 2.5;

    const sliceWidth = width / timeDomainData.length;
    let x = 0;

    for (let i = 0; i < timeDomainData.length; i++) {
      const v = timeDomainData[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.stroke();

    // Center hairline axis
    ctx.strokeStyle = hairlineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
  }

  // 4. Render Typographic Card / Metadata Overlay
  if (options.title) {
    ctx.save();
    ctx.textAlign = 'center';
    
    // Title
    ctx.font = `600 ${Math.max(16, Math.round(width * 0.024))}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = fgColor;
    ctx.fillText(options.title, centerX, height * 0.88);

    // Artist
    if (options.artist) {
      ctx.font = `400 ${Math.max(12, Math.round(width * 0.015))}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = mutedColor;
      ctx.fillText(options.artist, centerX, height * 0.92);
    }

    // Infinity brand mark watermark in corner
    ctx.font = `500 ${Math.max(11, Math.round(width * 0.012))}px "JetBrains Mono", monospace`;
    ctx.fillStyle = hairlineColor;
    ctx.textAlign = 'left';
    ctx.fillText('∞ INFINITY CONVERTER', width * 0.04, height * 0.07);

    ctx.restore();
  }
}
