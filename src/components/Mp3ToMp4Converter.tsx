import React, { useState, useRef } from 'react';
import {
  Video,
  Download,
  RotateCcw,
  CheckCircle,
  Image as ImageIcon,
  Music,
} from 'lucide-react';
import { formatBytes } from '../utils/audioEncoder';
import { downloadMedia } from '../utils/downloadHelper';
import { synthesizeLandscapeVideoClient } from '../utils/videoSynthesizer';

export const Mp3ToMp4Converter: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Converted output video
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [serverDownloadUrl, setServerDownloadUrl] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState<string>('');

  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const handleAudio = (file: File) => {
    setError(null);
    setOutputBlob(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setServerDownloadUrl(null);

    setAudioFile(file);
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    setOutputFilename(`${baseName || 'video'}.mp4`);
  };

  const handleImage = (file: File) => {
    setError(null);
    setOutputBlob(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setServerDownloadUrl(null);

    setImageFile(file);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
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
    setProgress(20);
    setError(null);
    setStage('Synthesizing landscape video...');

    try {
      let succeeded = false;

      // 1. Try server conversion first
      try {
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('image', imageFile);
        formData.append('fps', '30');

        const res = await fetch('/api/convert/mp3-to-mp4', {
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
        console.warn('Server endpoint unavailable, falling back to on-device synthesizer:', networkErr);
      }

      // 2. Client-side fallback: synthesizes 16:9 video on device without network
      if (!succeeded) {
        setStage('Synthesizing 16:9 video on device...');
        setProgress(50);

        const localBlob = await synthesizeLandscapeVideoClient(audioFile, imageFile, (msg) => {
          setStage(msg);
        });

        const url = URL.createObjectURL(localBlob);
        setOutputBlob(localBlob);
        setOutputUrl(url);
        setProgress(100);
        setStage('Complete!');
      }
    } catch (err: any) {
      console.error('Video conversion error:', err);
      setError(err.message || 'Video conversion failed. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!outputBlob) return;
    downloadMedia(outputBlob, outputFilename, serverDownloadUrl || undefined);
  };

  const resetAll = () => {
    setAudioFile(null);
    setImageFile(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    setOutputBlob(null);
    setServerDownloadUrl(null);
    setProgress(0);
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Hidden File Inputs */}
      <input
        ref={audioInputRef}
        id="mp3-to-mp4-audio-input"
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg"
        className="hidden"
        onClick={(e) => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={(e) => e.target.files?.[0] && handleAudio(e.target.files[0])}
      />
      <input
        ref={imageInputRef}
        id="mp3-to-mp4-image-input"
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp,.bmp"
        className="hidden"
        onClick={(e) => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
      />

      {/* Upload Boxes: Audio and Image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Audio Picker Box */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => audioInputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && audioInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleAudio(e.dataTransfer.files[0]);
          }}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer text-center select-none ${
            audioFile
              ? 'border-white bg-neutral-900/60'
              : 'border-neutral-800 hover:border-white bg-neutral-950/60 hover:bg-neutral-900/50'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 text-white mb-3 shadow-lg">
            <Music className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-white">
            {audioFile ? audioFile.name : 'Select Files'}
          </div>
          <div className="text-xs font-mono text-neutral-400 mt-1">
            {audioFile ? formatBytes(audioFile.size) : 'Audio'}
          </div>
        </div>

        {/* Image Picker Box */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => imageInputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && imageInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleImage(e.dataTransfer.files[0]);
          }}
          className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer text-center select-none ${
            imageFile
              ? 'border-white bg-neutral-900/60'
              : 'border-neutral-800 hover:border-white bg-neutral-950/60 hover:bg-neutral-900/50'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 text-white mb-3 shadow-lg">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-white">
            {imageFile ? imageFile.name : 'Select Files'}
          </div>
          <div className="text-xs font-mono text-neutral-400 mt-1">
            {imageFile ? formatBytes(imageFile.size) : 'Image'}
          </div>
        </div>
      </div>

      {/* 16:9 Landscape Preview Card */}
      {(audioFile || imageFile) && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Landscape 16:9 Preview
            </div>

            <button
              type="button"
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
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
                Select an image to preview 16:9 landscape video
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-xs font-mono">
              {error}
            </div>
          )}

          {/* Convert Action Button */}
          <div className="pt-2">
            <button
              disabled={isConverting || !audioFile || !imageFile}
              onClick={handleConvert}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xl"
            >
              {isConverting ? (
                <>
                  <span className="inline-block animate-spin font-mono text-lg">∞</span>
                  <span>{stage || 'Converting to MP4...'}</span>
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  <span>Convert to MP4</span>
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
      )}

      {/* Result Video Player Card */}
      {outputUrl && outputBlob && (
        <div className="rounded-2xl border-2 border-white/80 bg-neutral-950 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>MP4 Video Ready</span>
            </div>
            <div className="text-xs font-mono text-neutral-400">
              {formatBytes(outputBlob.size)}
            </div>
          </div>

          {/* 16:9 Landscape Video Player */}
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black aspect-video flex items-center justify-center">
            <video
              src={outputUrl}
              controls
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs font-mono text-neutral-400 truncate max-w-xs">
              {outputFilename}
            </div>

            {/* Reliable Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-200 transition-colors cursor-pointer shrink-0 shadow-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download MP4</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
