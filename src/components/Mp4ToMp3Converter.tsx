import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Music,
  Sliders,
  Play,
  Pause,
  Download,
  RotateCcw,
  CheckCircle,
  Clock,
  HardDrive,
  Cpu,
  FileAudio,
} from 'lucide-react';
import { AudioSettings, MediaProbeInfo } from '../types';
import { formatBytes, formatDuration, extractAudioFromVideoLocal, audioBufferToWav } from '../utils/audioEncoder';

export const Mp4ToMp3Converter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [probeInfo, setProbeInfo] = useState<MediaProbeInfo | null>(null);

  // Settings
  const [settings, setSettings] = useState<AudioSettings>({
    bitrate: '320k',
    sampleRate: '44100',
    channels: '2',
    startTime: 0,
    endTime: 0,
    title: '',
    artist: '',
    album: '',
    year: new Date().getFullYear().toString(),
    genre: 'Various',
  });

  const [engine, setEngine] = useState<'ffmpeg' | 'browser'>('ffmpeg');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Output
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');

  // Audio preview
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle file select
  const handleFile = async (selectedFile: File) => {
    setError(null);
    setOutputBlob(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);

    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setVideoUrl(url);

    // Initial default title from filename
    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
    setSettings((prev) => ({
      ...prev,
      title: baseName,
      endTime: 0,
    }));

    // Server inspect probe
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch('/api/inspect', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setProbeInfo(data);
        if (data.duration) {
          setSettings((prev) => ({
            ...prev,
            endTime: Math.round(data.duration * 10) / 10,
          }));
        }
      } else {
        // Fallback probe via HTML video element
        const tempVideo = document.createElement('video');
        tempVideo.src = url;
        tempVideo.onloadedmetadata = () => {
          setProbeInfo({
            duration: tempVideo.duration,
            size: selectedFile.size,
            formatName: selectedFile.type || 'video/mp4',
            videoWidth: tempVideo.videoWidth,
            videoHeight: tempVideo.videoHeight,
          });
          setSettings((prev) => ({
            ...prev,
            endTime: Math.round(tempVideo.duration * 10) / 10,
          }));
        };
      }
    } catch {
      // If server inspect fails, fallback to local duration probe
      const tempVideo = document.createElement('video');
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        setProbeInfo({
          duration: tempVideo.duration,
          size: selectedFile.size,
          formatName: selectedFile.type || 'video/mp4',
          videoWidth: tempVideo.videoWidth,
          videoHeight: tempVideo.videoHeight,
        });
        setSettings((prev) => ({
          ...prev,
          endTime: Math.round(tempVideo.duration * 10) / 10,
        }));
      };
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Run conversion
  const handleConvert = async () => {
    if (!file) return;
    setIsConverting(true);
    setProgress(5);
    setError(null);
    setStage('Demuxing video container...');

    try {
      if (engine === 'ffmpeg') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bitrate', settings.bitrate);
        formData.append('sampleRate', settings.sampleRate);
        formData.append('channels', settings.channels);
        if (settings.startTime && settings.startTime > 0) {
          formData.append('startTime', settings.startTime.toString());
        }
        if (settings.endTime && settings.endTime > 0) {
          formData.append('endTime', settings.endTime.toString());
        }
        formData.append('title', settings.title || '');
        formData.append('artist', settings.artist || '');
        formData.append('album', settings.album || '');
        formData.append('year', settings.year || '');
        formData.append('genre', settings.genre || '');

        setStage('Encoding LAME MP3 audio track at ' + settings.bitrate + '...');
        setProgress(35);

        const res = await fetch('/api/convert/mp4-to-mp3', {
          method: 'POST',
          body: formData,
        });

        setProgress(75);
        setStage('Finalizing ID3 metadata & container...');

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || errData.details || 'Server conversion failed');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const outName = `${(settings.title || 'audio').replace(/[^a-zA-Z0-9_-]/g, '_')}.mp3`;

        setOutputBlob(blob);
        setOutputUrl(url);
        setOutputFilename(outName);
        setProgress(100);
        setStage('Complete!');
      } else {
        // Local Browser conversion fallback
        setStage('Decoding audio stream with Web Audio API...');
        setProgress(25);
        const audioBuffer = await extractAudioFromVideoLocal(file, (p) => setProgress(p));
        setStage('Encoding audio buffer...');
        setProgress(85);
        const wavBlob = audioBufferToWav(audioBuffer);
        const url = URL.createObjectURL(wavBlob);
        const outName = `${(settings.title || 'audio').replace(/[^a-zA-Z0-9_-]/g, '_')}.mp3`;

        setOutputBlob(wavBlob);
        setOutputUrl(url);
        setOutputFilename(outName);
        setProgress(100);
        setStage('Complete!');
      }
    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err.message || 'Conversion failed. Please try again or switch engine.');
    } finally {
      setIsConverting(false);
    }
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const resetAll = () => {
    setFile(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputBlob(null);
    setProbeInfo(null);
    setProgress(0);
    setError(null);
  };

  const calculateSavings = () => {
    if (!file || !outputBlob) return null;
    const original = file.size;
    const converted = outputBlob.size;
    const diff = original - converted;
    const percent = Math.round((diff / original) * 100);
    return {
      original,
      converted,
      diff,
      percent: Math.max(0, percent),
    };
  };

  const savings = calculateSavings();

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Upload Zone */}
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="group relative flex flex-col items-center justify-center p-12 border-2 border-dashed border-neutral-800 hover:border-white rounded-2xl bg-neutral-950/60 hover:bg-neutral-900/50 transition-all cursor-pointer text-center select-none"
        >
          <input
            ref={fileInputRef}
            id="mp4-file-input"
            type="file"
            accept="video/*,.mp4,.mov,.mkv,.webm,.avi"
            className="hidden"
            onClick={(e) => {
              (e.target as HTMLInputElement).value = '';
            }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-700 bg-neutral-900 text-white shadow-lg mb-4 group-hover:scale-105 transition-transform">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-white">
            Select Files
          </h3>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File Overview Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 dark:border-neutral-800 dark:bg-neutral-950 light:border-neutral-200 light:bg-white shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-700 text-white dark:bg-neutral-900 dark:border-neutral-700 light:bg-neutral-100 light:border-neutral-300 light:text-black">
                  <FileAudio className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white dark:text-white light:text-black truncate">
                    {file.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 dark:text-neutral-400 light:text-neutral-500 mt-0.5">
                    <span>{formatBytes(file.size)}</span>
                    {probeInfo?.duration ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{formatDuration(probeInfo.duration)}</span>
                      </>
                    ) : null}
                    {probeInfo?.videoWidth ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{probeInfo.videoWidth}×{probeInfo.videoHeight}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                onClick={resetAll}
                className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white dark:text-neutral-400 dark:hover:text-white light:text-neutral-600 light:hover:text-black transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Change File</span>
              </button>
            </div>

            {/* Video preview & trimming scrub */}
            {videoUrl && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black aspect-video flex items-center justify-center">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-400 light:text-neutral-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Audio Trimming (Optional)
                    </span>
                    <span className="text-xs font-mono text-neutral-400">
                      {formatDuration(settings.startTime || 0)} - {formatDuration(settings.endTime || probeInfo?.duration || 0)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-neutral-400 mb-1">
                        Start Time (s)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={settings.endTime || probeInfo?.duration || 1000}
                        step="0.5"
                        value={settings.startTime || 0}
                        onChange={(e) =>
                          setSettings({ ...settings, startTime: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-mono text-white dark:border-neutral-800 dark:bg-neutral-900 light:border-neutral-300 light:bg-neutral-50 light:text-black focus:border-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-neutral-400 mb-1">
                        End Time (s)
                      </label>
                      <input
                        type="number"
                        min={settings.startTime || 0}
                        max={probeInfo?.duration || 10000}
                        step="0.5"
                        value={settings.endTime || Math.round(probeInfo?.duration || 0)}
                        onChange={(e) =>
                          setSettings({ ...settings, endTime: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-mono text-white dark:border-neutral-800 dark:bg-neutral-900 light:border-neutral-300 light:bg-neutral-50 light:text-black focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Engine choice */}
                  <div className="pt-2 border-t border-neutral-800/80">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      Processing Engine
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEngine('ffmpeg')}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all cursor-pointer ${
                          engine === 'ffmpeg'
                            ? 'border-white bg-white text-black font-semibold'
                            : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold">FFmpeg Studio (Server)</div>
                        <div className="text-[10px] opacity-80 font-mono">Lossless 320k LAME · Ultra Fast</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEngine('browser')}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all cursor-pointer ${
                          engine === 'browser'
                            ? 'border-white bg-white text-black font-semibold'
                            : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold">Local Device (Browser)</div>
                        <div className="text-[10px] opacity-80 font-mono">100% On-Device · Offline</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Audio Parameters & Metadata Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 dark:border-neutral-800 dark:bg-neutral-950 light:border-neutral-200 light:bg-white shadow-xl space-y-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 pb-3 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
              <Sliders className="w-4 h-4" />
              <span>Audio Encoding Parameters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Bitrate */}
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1.5">
                  Audio Bitrate
                </label>
                <select
                  value={settings.bitrate}
                  onChange={(e) => setSettings({ ...settings, bitrate: e.target.value as any })}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-white dark:border-neutral-800 dark:bg-neutral-900 light:border-neutral-300 light:bg-neutral-50 light:text-black focus:border-white focus:outline-none cursor-pointer"
                >
                  <option value="320k">320 kbps (Studio Quality)</option>
                  <option value="256k">256 kbps (High Fidelity)</option>
                  <option value="192k">192 kbps (Standard CD)</option>
                  <option value="128k">128 kbps (Compact Web)</option>
                </select>
              </div>

              {/* Sample Rate */}
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1.5">
                  Sample Rate
                </label>
                <select
                  value={settings.sampleRate}
                  onChange={(e) => setSettings({ ...settings, sampleRate: e.target.value as any })}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-white dark:border-neutral-800 dark:bg-neutral-900 light:border-neutral-300 light:bg-neutral-50 light:text-black focus:border-white focus:outline-none cursor-pointer"
                >
                  <option value="48000">48,000 Hz (Pro Broadcast)</option>
                  <option value="44100">44,100 Hz (Standard Audio CD)</option>
                </select>
              </div>

              {/* Channels */}
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1.5">
                  Channels
                </label>
                <select
                  value={settings.channels}
                  onChange={(e) => setSettings({ ...settings, channels: e.target.value as any })}
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-mono text-white dark:border-neutral-800 dark:bg-neutral-900 light:border-neutral-300 light:bg-neutral-50 light:text-black focus:border-white focus:outline-none cursor-pointer"
                >
                  <option value="2">Stereo (2 Channels)</option>
                  <option value="1">Mono (Single Channel)</option>
                </select>
              </div>
            </div>

            {/* ID3 Tags */}
            <div className="pt-2 border-t border-neutral-800/80">
              <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                ID3 Metadata Tags
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Track Title
                  </label>
                  <input
                    type="text"
                    value={settings.title || ''}
                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                    placeholder="Track Title"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white dark:border-neutral-800 dark:bg-neutral-900 light:border-neutral-300 light:bg-neutral-50 light:text-black focus:border-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Artist Name
                  </label>
                  <input
                    type="text"
                    value={settings.artist || ''}
                    onChange={(e) => setSettings({ ...settings, artist: e.target.value })}
                    placeholder="Artist Name"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white dark:border-neutral-800 dark:bg-neutral-900 light:border-neutral-300 light:bg-neutral-50 light:text-black focus:border-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">
                    Album Name
                  </label>
                  <input
                    type="text"
                    value={settings.album || ''}
                    onChange={(e) => setSettings({ ...settings, album: e.target.value })}
                    placeholder="Album Name"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white dark:border-neutral-800 dark:bg-neutral-900 light:border-neutral-300 light:bg-neutral-50 light:text-black focus:border-white focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-mono text-neutral-400 mb-1">
                      Year
                    </label>
                    <input
                      type="text"
                      value={settings.year || ''}
                      onChange={(e) => setSettings({ ...settings, year: e.target.value })}
                      placeholder="2026"
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white dark:border-neutral-800 dark:bg-neutral-900 light:border-neutral-300 light:bg-neutral-50 light:text-black focus:border-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-neutral-400 mb-1">
                      Genre
                    </label>
                    <input
                      type="text"
                      value={settings.genre || ''}
                      onChange={(e) => setSettings({ ...settings, genre: e.target.value })}
                      placeholder="Electronic"
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white dark:border-neutral-800 dark:bg-neutral-900 light:border-neutral-300 light:bg-neutral-50 light:text-black focus:border-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-xs font-mono">
                {error}
              </div>
            )}

            {/* Convert Trigger Button */}
            <div className="pt-2">
              <button
                disabled={isConverting}
                onClick={handleConvert}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xl"
              >
                {isConverting ? (
                  <>
                    <span className="inline-block animate-spin font-mono text-lg">∞</span>
                    <span>{stage || 'Converting to MP3...'}</span>
                  </>
                ) : (
                  <>
                    <Music className="w-4 h-4" />
                    <span>Extract MP3 Audio ({settings.bitrate})</span>
                  </>
                )}
              </button>

              {/* Progress Bar */}
              {isConverting && (
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-neutral-400">
                    <span>{stage}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Output Audio Result Card */}
          {outputUrl && outputBlob && (
            <div className="rounded-2xl border-2 border-white/80 bg-neutral-950 p-6 dark:border-white/80 dark:bg-neutral-950 light:border-black light:bg-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white dark:text-white light:text-black">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Conversion Complete</span>
                </div>
                <div className="text-xs font-mono text-neutral-400">
                  {settings.bitrate} · {settings.sampleRate} Hz
                </div>
              </div>

              {/* Storage Savings Strip */}
              {savings && (
                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60 dark:border-neutral-800 dark:bg-neutral-900/60 light:border-neutral-200 light:bg-neutral-50 text-center">
                  <div>
                    <span className="block text-[10px] font-mono uppercase text-neutral-400">
                      Original MP4
                    </span>
                    <span className="text-xs font-mono font-semibold text-white dark:text-white light:text-black">
                      {formatBytes(savings.original)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono uppercase text-neutral-400">
                      Output MP3
                    </span>
                    <span className="text-xs font-mono font-semibold text-white dark:text-white light:text-black">
                      {formatBytes(savings.converted)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono uppercase text-neutral-400">
                      Saved
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      -{savings.percent}%
                    </span>
                  </div>
                </div>
              )}

              {/* Audio Playback Element */}
              <div className="flex items-center gap-4 p-3 rounded-xl border border-neutral-800 bg-neutral-900">
                <audio
                  ref={audioRef}
                  src={outputUrl}
                  onEnded={() => setIsPlayingAudio(false)}
                  onPlay={() => setIsPlayingAudio(true)}
                  onPause={() => setIsPlayingAudio(false)}
                  className="hidden"
                />

                <button
                  onClick={togglePlayAudio}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">
                    {outputFilename}
                  </div>
                  <div className="text-[11px] font-mono text-neutral-400">
                    Ready to download · {formatBytes(outputBlob.size)}
                  </div>
                </div>

                <a
                  href={outputUrl}
                  download={outputFilename}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-200 transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP3</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
