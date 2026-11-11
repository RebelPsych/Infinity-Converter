import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Video,
  Play,
  Pause,
  Download,
  RotateCcw,
  CheckCircle,
  Image as ImageIcon,
  Music,
} from 'lucide-react';
import { formatBytes, formatDuration } from '../utils/audioEncoder';

export const Mp3ToMp4Converter: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [duration, setDuration] = useState<number>(0);
  const [showWaveform, setShowWaveform] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Output video
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const handleAudio = (file: File) => {
    setError(null);
    setOutputBlob(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);

    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    const temp = new Audio(url);
    temp.onloadedmetadata = () => {
      setDuration(temp.duration);
    };
  };

  const handleImage = (file: File) => {
    setError(null);
    setOutputBlob(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);

    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleConvert = async () => {
    if (!audioFile) {
      setError('Please select an audio file.');
      return;
    }
    if (!imageFile) {
      setError('Please select an image for the landscape video.');
      return;
    }

    setIsConverting(true);
    setProgress(15);
    setError(null);
    setStage('Formatting landscape video...');

    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('image', imageFile);
      formData.append('showWaveform', showWaveform ? 'true' : 'false');
      formData.append('fps', '30');

      setProgress(40);
      setStage('Encoding 16:9 landscape video...');

      const res = await fetch('/api/convert/mp3-to-mp4', {
        method: 'POST',
        body: formData,
      });

      setProgress(85);
      setStage('Finalizing MP4 container...');

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || 'Conversion failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const baseName = audioFile.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const outName = `${baseName}.mp4`;

      setOutputBlob(blob);
      setOutputUrl(url);
      setOutputFilename(outName);
      setProgress(100);
      setStage('Complete!');
    } catch (err: any) {
      console.error('Video conversion error:', err);
      setError(err.message || 'Video synthesis failed. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const resetAll = () => {
    setAudioFile(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setImageFile(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputBlob(null);
    setProgress(0);
    setError(null);
    setIsPlaying(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Hidden file inputs */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleAudio(e.target.files[0])}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp,.bmp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
      />

      {/* Hidden Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          className="hidden"
        />
      )}

      {/* Top Upload Pickers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Audio Picker Box */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleAudio(e.dataTransfer.files[0]);
          }}
          onClick={() => audioInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer text-center ${
            audioFile
              ? 'border-white bg-neutral-900/60 dark:border-white dark:bg-neutral-900/60 light:border-black light:bg-neutral-100'
              : 'border-neutral-800 hover:border-neutral-600 bg-neutral-950/60 dark:border-neutral-800 dark:bg-neutral-950/60 light:border-neutral-300 light:bg-neutral-50'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 text-white dark:border-neutral-700 dark:bg-neutral-900 light:border-neutral-300 light:bg-white light:text-black mb-3">
            <Music className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-white dark:text-white light:text-black">
            {audioFile ? audioFile.name : '1. Select Audio (MP3)'}
          </div>
          <div className="text-xs font-mono text-neutral-400 mt-1">
            {audioFile ? `${formatBytes(audioFile.size)} · ${formatDuration(duration)}` : 'Click or drop audio file'}
          </div>
        </div>

        {/* Image Picker Box */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleImage(e.dataTransfer.files[0]);
          }}
          onClick={() => imageInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer text-center ${
            imageFile
              ? 'border-white bg-neutral-900/60 dark:border-white dark:bg-neutral-900/60 light:border-black light:bg-neutral-100'
              : 'border-neutral-800 hover:border-neutral-600 bg-neutral-950/60 dark:border-neutral-800 dark:bg-neutral-950/60 light:border-neutral-300 light:bg-neutral-50'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 text-white dark:border-neutral-700 dark:bg-neutral-900 light:border-neutral-300 light:bg-white light:text-black mb-3">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-white dark:text-white light:text-black">
            {imageFile ? imageFile.name : '2. Select Image'}
          </div>
          <div className="text-xs font-mono text-neutral-400 mt-1">
            {imageFile ? `${formatBytes(imageFile.size)} · Formatted for 16:9 Landscape` : 'Click or drop image file'}
          </div>
        </div>
      </div>

      {/* 16:9 Landscape Preview Card */}
      {(audioFile || imageFile) && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 dark:border-neutral-800 dark:bg-neutral-950 light:border-neutral-200 light:bg-white shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 dark:border-neutral-800 light:border-neutral-200">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Landscape 16:9 Preview
            </div>

            <div className="flex items-center gap-3">
              {audioUrl && (
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-neutral-800 bg-neutral-900 text-white text-xs font-mono uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Play Audio'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={resetAll}
                className="flex items-center gap-1 text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* 16:9 Viewport Display */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-neutral-800 flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Landscape View"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-6 text-neutral-500 font-mono text-xs">
                Please select an image above to preview 16:9 landscape video
              </div>
            )}

            {/* Optional subtle waveform visual overlay */}
            {showWaveform && imageUrl && (
              <div className="absolute bottom-4 left-0 right-0 px-8 flex items-end justify-center gap-1 h-8 opacity-80 pointer-events-none">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-white rounded-full transition-all duration-150"
                    style={{
                      height: isPlaying ? `${Math.max(4, Math.sin(i * 0.4 + Date.now() / 200) * 24 + 12)}px` : '4px',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Controls & Waveform Toggle */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs font-mono text-neutral-300 dark:text-neutral-300 light:text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showWaveform}
                onChange={(e) => setShowWaveform(e.target.checked)}
                className="rounded border-neutral-700 bg-neutral-900 text-white focus:ring-0 cursor-pointer"
              />
              <span>Overlay audio waveform line</span>
            </label>

            <span className="text-xs font-mono text-neutral-500">
              1920×1080 Landscape
            </span>
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-xs font-mono">
              {error}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              disabled={isConverting || !audioFile || !imageFile}
              onClick={handleConvert}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xl"
            >
              {isConverting ? (
                <>
                  <span className="inline-block animate-spin font-mono text-lg">∞</span>
                  <span>{stage || 'Creating Landscape MP4...'}</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Convert to Landscape MP4</span>
                </>
              )}
            </button>

            {/* Progress bar */}
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
      )}

      {/* Result Video Card */}
      {outputUrl && outputBlob && (
        <div className="rounded-2xl border-2 border-white/80 bg-neutral-950 p-6 dark:border-white/80 dark:bg-neutral-950 light:border-black light:bg-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white dark:text-white light:text-black">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Landscape MP4 Ready</span>
            </div>
            <div className="text-xs font-mono text-neutral-400">
              1920×1080 · {formatBytes(outputBlob.size)}
            </div>
          </div>

          {/* Output Video Player in Landscape */}
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black aspect-video flex items-center justify-center">
            <video
              src={outputUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs font-mono text-neutral-400 truncate max-w-sm">
              {outputFilename}
            </div>

            <a
              href={outputUrl}
              download={outputFilename}
              className="flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-200 transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download MP4</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
