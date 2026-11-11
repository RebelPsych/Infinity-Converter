/**
 * Audio encoding and decoding utilities for client-side processing
 */

// Helper to convert AudioBuffer to WAV format
export function audioBufferToWav(buffer: AudioBuffer, opt?: { float32?: boolean }): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = opt?.float32 ? 3 : 1;
  const bitDepth = format === 3 ? 32 : 16;

  let result: Float32Array;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);

  let index = 0;
  let inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function encodeWAV(
  samples: Float32Array,
  format: number,
  sampleRate: number,
  numChannels: number,
  bitDepth: number
): Blob {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * bytesPerSample, true);

  if (format === 1) {
    // 16-bit PCM
    floatTo16BitPCM(view, 44, samples);
  } else {
    writeFloat32(view, 44, samples);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function writeFloat32(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i], true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Extract Audio from video file locally using Web Audio API
export async function extractAudioFromVideoLocal(
  videoFile: File,
  onProgress?: (percent: number) => void
): Promise<AudioBuffer> {
  onProgress?.(15);
  const arrayBuffer = await videoFile.arrayBuffer();
  onProgress?.(45);
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  onProgress?.(90);
  return audioBuffer;
}

// Trim an AudioBuffer between start and end seconds
export function trimAudioBuffer(
  audioBuffer: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const sampleRate = audioBuffer.sampleRate;
  const startOffset = Math.max(0, Math.floor(startSec * sampleRate));
  const endOffset = Math.min(audioBuffer.length, Math.floor(endSec * sampleRate));
  const frameCount = Math.max(1, endOffset - startOffset);

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const trimmed = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    frameCount,
    sampleRate
  );

  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    const channelData = audioBuffer.getChannelData(i).subarray(startOffset, endOffset);
    trimmed.copyToChannel(channelData, i, 0);
  }

  return trimmed;
}

// Format duration in mm:ss or hh:mm:ss
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Format bytes to human readable string
export function formatBytes(bytes: number, decimals = 1): string {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
