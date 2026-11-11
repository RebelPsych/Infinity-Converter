export type ConversionMode = 'mp4-to-mp3' | 'mp3-to-mp4' | 'batch';

export type AudioBitrate = '320k' | '256k' | '192k' | '128k';
export type AudioSampleRate = '44100' | '48000';
export type AudioChannels = '2' | '1';

export type VisualizerPreset = 'infinity' | 'spectrum' | 'circular' | 'oscilloscope';
export type VideoAspectRatio = '16:9' | '1:1' | '9:16';
export type VideoTheme = 'dark' | 'light';

export interface AudioSettings {
  bitrate: AudioBitrate;
  sampleRate: AudioSampleRate;
  channels: AudioChannels;
  startTime?: number; // seconds
  endTime?: number;   // seconds
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
}

export interface VideoSettings {
  preset: VisualizerPreset;
  aspectRatio: VideoAspectRatio;
  fps: 30 | 60;
  theme: VideoTheme;
  title?: string;
  artist?: string;
  artworkUrl?: string;
}

export interface MediaProbeInfo {
  duration: number;
  formatName: string;
  bitrate?: number;
  size: number;
  videoWidth?: number;
  videoHeight?: number;
  videoCodec?: string;
  audioCodec?: string;
  audioSampleRate?: number;
  audioChannels?: number;
}

export interface BatchItem {
  id: string;
  file: File;
  mode: 'mp4-to-mp3' | 'mp3-to-mp4';
  status: 'queued' | 'converting' | 'completed' | 'error';
  progress: number;
  outputBlob?: Blob;
  outputUrl?: string;
  outputName?: string;
  outputSize?: number;
  error?: string;
}
