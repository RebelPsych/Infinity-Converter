import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export interface SynthesizedVideo {
  blob: Blob;
  extension: 'mp4' | 'webm';
}

/**
 * Client-side 16:9 Landscape MP4 synthesizer.
 * Uses WebCodecs (VideoEncoder + AudioEncoder) + mp4-muxer for fast offline MP4 encoding,
 * with a MediaRecorder fallback for older browsers.
 */
export async function synthesizeLandscapeVideoClient(
  audioFile: File,
  imageFile: File,
  onProgress?: (msg: string, percent?: number) => void
): Promise<SynthesizedVideo> {
  onProgress?.('Preparing image & audio...', 10);

  // 1. Load image
  const img = new Image();
  const imgUrl = URL.createObjectURL(imageFile);

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imgUrl;
    });

    // 2. Decode audio
    onProgress?.('Decoding audio track...', 20);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    let audioBuffer: AudioBuffer;
    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } finally {
      audioContext.close().catch(() => {});
    }

    // 3. Try fast WebCodecs + mp4-muxer path
    if (
      typeof VideoEncoder !== 'undefined' &&
      typeof AudioEncoder !== 'undefined' &&
      typeof VideoFrame !== 'undefined' &&
      typeof AudioData !== 'undefined'
    ) {
      try {
        const result = await encodeWithWebCodecs(img, audioBuffer, onProgress);
        return { blob: result, extension: 'mp4' };
      } catch (wcErr) {
        console.warn('WebCodecs encoding failed, falling back to MediaRecorder:', wcErr);
      }
    }

    // 4. Fallback to MediaRecorder
    const fallback = await encodeWithMediaRecorder(img, audioBuffer, onProgress);
    return fallback;
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
}

function drawLandscapeFrame(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  width: number,
  height: number
) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context not available');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const imgAspect = img.naturalWidth / Math.max(1, img.naturalHeight);
  const targetAspect = width / height;
  let drawW = width;
  let drawH = height;
  let drawX = 0;
  let drawY = 0;

  if (imgAspect > targetAspect) {
    drawW = width;
    drawH = width / imgAspect;
    drawY = (height - drawH) / 2;
  } else {
    drawH = height;
    drawW = height * imgAspect;
    drawX = (width - drawW) / 2;
  }

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

async function encodeWithWebCodecs(
  img: HTMLImageElement,
  audioBuffer: AudioBuffer,
  onProgress?: (msg: string, percent?: number) => void
): Promise<Blob> {
  // Choose supported resolution (1920x1080 preferred, fallback 1280x720)
  let width = 1920;
  let height = 1080;
  const videoCodecCandidates = ['avc1.420028', 'avc1.42001f', 'avc1.4d002a'];
  let selectedVideoConfig: VideoEncoderConfig | null = null;

  for (const res of [
    { w: 1920, h: 1080 },
    { w: 1280, h: 720 },
  ]) {
    for (const codec of videoCodecCandidates) {
      const cfg: VideoEncoderConfig = {
        codec,
        width: res.w,
        height: res.h,
        bitrate: 1_500_000,
        framerate: 1,
      };
      try {
        const support = await VideoEncoder.isConfigSupported(cfg);
        if (support.supported) {
          selectedVideoConfig = cfg;
          width = res.w;
          height = res.h;
          break;
        }
      } catch {
        // try next
      }
    }
    if (selectedVideoConfig) break;
  }

  if (!selectedVideoConfig) {
    throw new Error('H.264 VideoEncoder not supported');
  }

  // Choose supported audio codec (AAC preferred, Opus fallback)
  const channels = Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  let audioMuxCodec: 'aac' | 'opus' = 'aac';
  let selectedAudioConfig: AudioEncoderConfig | null = null;

  for (const candidate of [
    { mux: 'aac' as const, codec: 'mp4a.40.2', bitrate: 160_000 },
    { mux: 'opus' as const, codec: 'opus', bitrate: 128_000 },
  ]) {
    const cfg: AudioEncoderConfig = {
      codec: candidate.codec,
      numberOfChannels: channels,
      sampleRate,
      bitrate: candidate.bitrate,
    };
    try {
      const support = await AudioEncoder.isConfigSupported(cfg);
      if (support.supported) {
        selectedAudioConfig = cfg;
        audioMuxCodec = candidate.mux;
        break;
      }
    } catch {
      // try next
    }
  }

  if (!selectedAudioConfig) {
    throw new Error('AudioEncoder not supported');
  }

  onProgress?.('Encoding 16:9 video frames...', 35);

  const canvas = document.createElement('canvas');
  drawLandscapeFrame(canvas, img, width, height);

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
    },
    audio: {
      codec: audioMuxCodec,
      numberOfChannels: channels,
      sampleRate,
    },
    fastStart: 'in-memory',
  });

  let encodeError: Error | null = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => { encodeError = err; },
  });
  videoEncoder.configure(selectedVideoConfig);

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (err) => { encodeError = err; },
  });
  audioEncoder.configure(selectedAudioConfig);

  // Encode 1 frame per second across audio duration
  const durationSec = Math.max(1, Math.ceil(audioBuffer.duration));
  for (let sec = 0; sec < durationSec; sec++) {
    if (encodeError) throw encodeError;
    const frame = new VideoFrame(canvas, {
      timestamp: sec * 1_000_000,
      duration: 1_000_000,
    });
    videoEncoder.encode(frame, { keyFrame: sec % 5 === 0 });
    frame.close();
    if (sec % 20 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress?.('Encoding audio track...', 65);

  // Encode PCM audio chunks in planar f32 format
  const totalSamples = audioBuffer.length;
  const chunkFrames = 4096;
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = channels > 1 ? audioBuffer.getChannelData(1) : null;

  for (let offset = 0; offset < totalSamples; offset += chunkFrames) {
    if (encodeError) throw encodeError;
    const frames = Math.min(chunkFrames, totalSamples - offset);
    const data = new Float32Array(frames * channels);
    data.set(ch0.subarray(offset, offset + frames), 0);
    if (ch1) {
      data.set(ch1.subarray(offset, offset + frames), frames);
    }

    const timestampUs = Math.round((offset / sampleRate) * 1_000_000);
    const audioData = new AudioData({
      format: 'f32-planar',
      sampleRate,
      numberOfFrames: frames,
      numberOfChannels: channels,
      timestamp: timestampUs,
      data,
    });
    audioEncoder.encode(audioData);
    audioData.close();

    if (offset % (chunkFrames * 16) === 0) {
      const pct = 65 + Math.round((offset / totalSamples) * 28);
      onProgress?.('Encoding audio track...', Math.min(93, pct));
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress?.('Finalizing MP4...', 95);
  await videoEncoder.flush();
  await audioEncoder.flush();
  if (encodeError) throw encodeError;

  videoEncoder.close();
  audioEncoder.close();
  muxer.finalize();

  onProgress?.('Complete!', 100);
  return new Blob([target.buffer], { type: 'video/mp4' });
}

async function encodeWithMediaRecorder(
  img: HTMLImageElement,
  audioBuffer: AudioBuffer,
  onProgress?: (msg: string, percent?: number) => void
): Promise<SynthesizedVideo> {
  const width = 1280;
  const height = 720;
  const canvas = document.createElement('canvas');
  drawLandscapeFrame(canvas, img, width, height);

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const canvasStream = canvas.captureStream(15);
  const audioDest = audioContext.createMediaStreamDestination();
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioDest);

  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);

  const candidates = [
    { mime: 'video/mp4', ext: 'mp4' as const },
    { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' as const },
    { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' as const },
    { mime: 'video/webm', ext: 'webm' as const },
  ];

  const chosen = candidates.find((c) => MediaRecorder.isTypeSupported(c.mime));
  const mimeType = chosen?.mime;
  const ext = chosen?.ext || 'webm';

  const recorder = mimeType
    ? new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 1_500_000 })
    : new MediaRecorder(combinedStream);

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<SynthesizedVideo>((resolve, reject) => {
    const durationMs = Math.max(500, audioBuffer.duration * 1000);
    const startTime = Date.now();

    const interval = setInterval(() => {
      drawLandscapeFrame(canvas, img, width, height);
      const elapsed = Date.now() - startTime;
      const pct = Math.min(96, 30 + Math.round((elapsed / durationMs) * 65));
      onProgress?.('Recording video...', pct);
    }, 250);

    recorder.onstop = () => {
      clearInterval(interval);
      audioContext.close().catch(() => {});
      const outBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
      onProgress?.('Complete!', 100);
      resolve({ blob: outBlob, extension: ext });
    };

    recorder.onerror = (e) => {
      clearInterval(interval);
      audioContext.close().catch(() => {});
      reject(e);
    };

    source.onended = () => {
      setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, 200);
    };

    recorder.start(250);
    source.start(0);
  });
}
