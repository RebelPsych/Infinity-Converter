import React, { useState, useRef } from 'react';
import {
  Upload,
  Music,
  Play,
  Pause,
  Download,
  RotateCcw,
  CheckCircle,
  FileVideo,
} from 'lucide-react';
import {
  formatBytes,
  extractAudioFromVideoLocal,
  audioBufferToMp3,
} from '../utils/audioEncoder';
import { isAndroidApk, saveToAndroidBridge } from '../utils/downloadHelper';

export const Mp4ToMp3Converter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Converted result
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [serverDownloadUrl, setServerDownloadUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState(false);

  // Audio preview playback
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (selectedFile: File) => {
    setError(null);
    setSavedNotice(false);
    setOutputBlob(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setServerDownloadUrl(null);

    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setVideoUrl(url);

    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    setOutputFilename(`${baseName || 'audio'}.mp3`);
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsConverting(true);
    setSavedNotice(false);
    setProgress(15);
    setError(null);
    setStage('Extracting audio...');

    try {
      let succeeded = false;

      // 1. Try server conversion when running on web server
      if (!isAndroidApk()) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('bitrate', '320k');
          formData.append('sampleRate', '44100');
          formData.append('channels', '2');

          const res = await fetch('/api/convert/mp4-to-mp3', {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const dlUrl = res.headers.get('X-Download-Url');
            if (dlUrl) setServerDownloadUrl(dlUrl);

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setOutputBlob(blob);
            setOutputUrl(url);
            setProgress(100);
            setStage('Complete!');
            succeeded = true;
          }
        } catch (networkErr) {
          console.warn('Server conversion unavailable, switching to on-device MP3 encoder:', networkErr);
        }
      }

      // 2. Client-side real MP3 encoder fallback (and primary path in Android APK)
      if (!succeeded) {
        setStage('Encoding MP3 on device...');
        setProgress(25);

        const audioBuffer = await extractAudioFromVideoLocal(file, (p) => setProgress(p));
        const mp3Blob = await audioBufferToMp3(audioBuffer, 192, (p) => setProgress(p));
        const url = URL.createObjectURL(mp3Blob);

        setOutputBlob(mp3Blob);
        setOutputUrl(url);
        setProgress(100);
        setStage('Complete!');
      }
    } catch (err: any) {
      console.error('Audio conversion error:', err);
      setError(err.message || 'Conversion failed. Please try another video file.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownloadClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!outputBlob) {
      e.preventDefault();
      return;
    }

    if (isAndroidApk()) {
      e.preventDefault();
      const ok = await saveToAndroidBridge(outputBlob, outputFilename);
      if (ok) {
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 3000);
      } else {
        setError('Could not save file to Downloads.');
      }
      return;
    }

    // Standard web browser: allow native <a href={...} download={...}> behavior
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
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
    setServerDownloadUrl(null);
    setProgress(0);
    setError(null);
    setSavedNotice(false);
    setIsPlayingAudio(false);
  };

  const downloadHref = serverDownloadUrl || outputUrl || '#';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Upload Zone */}
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
          }}
          className="group relative flex flex-col items-center justify-center p-12 border-2 border-dashed border-neutral-800 hover:border-white rounded-2xl bg-neutral-950/60 hover:bg-neutral-900/50 transition-all cursor-pointer text-center select-none"
        >
          <input
            ref={fileInputRef}
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
          {/* Selected File Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-700 text-white">
                  <FileVideo className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white truncate">
                    {file.name}
                  </h4>
                  <p className="text-xs font-mono text-neutral-400 mt-0.5">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>

              <button
                onClick={resetAll}
                className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Change</span>
              </button>
            </div>

            {/* Video preview */}
            {videoUrl && (
              <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black aspect-video flex items-center justify-center">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-xs font-mono">
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
                    <span>Convert to MP3</span>
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

          {/* Converted MP3 Result Card */}
          {outputUrl && outputBlob && (
            <div className="rounded-2xl border-2 border-white/80 bg-neutral-950 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>MP3 Audio Ready</span>
                </div>
                <div className="text-xs font-mono text-neutral-400">
                  {formatBytes(outputBlob.size)}
                </div>
              </div>

              {/* Audio Player & Download */}
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
                  type="button"
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
                    {savedNotice ? 'Saved to Downloads' : formatBytes(outputBlob.size)}
                  </div>
                </div>

                {/* Native Download Link with APK bridge */}
                <a
                  href={downloadHref}
                  download={outputFilename}
                  onClick={handleDownloadClick}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-200 transition-colors cursor-pointer shrink-0 shadow-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{savedNotice ? 'Saved!' : 'Download MP3'}</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
