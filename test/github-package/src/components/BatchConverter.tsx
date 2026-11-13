import React, { useState, useRef } from 'react';
import {
  Upload,
  Layers,
  Play,
  CheckCircle,
  Download,
  Trash2,
  FileVideo,
  FileAudio,
  ArrowRight,
  Archive,
} from 'lucide-react';
import { BatchItem } from '../types';
import { formatBytes, extractAudioFromVideoLocal, audioBufferToMp3 } from '../utils/audioEncoder';
import { downloadMedia, isAndroidApk } from '../utils/downloadHelper';
import { synthesizeLandscapeVideoClient } from '../utils/videoSynthesizer';

async function createBlackImageFile(): Promise<File> {
  const c = document.createElement('canvas');
  c.width = 1280;
  c.height = 720;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, c.width, c.height);
  }
  const blob = await new Promise<Blob>((resolve) =>
    c.toBlob((b) => resolve(b || new Blob()), 'image/png')
  );
  return new File([blob], 'black.png', { type: 'image/png' });
}

export const BatchConverter: React.FC = () => {
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = (files: FileList | File[]) => {
    const newItems: BatchItem[] = Array.from(files).map((f) => {
      const isVideo = f.type.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi)$/i.test(f.name);
      return {
        id: Math.random().toString(36).substring(7),
        file: f,
        mode: isVideo ? 'mp4-to-mp3' : 'mp3-to-mp4',
        status: 'queued',
        progress: 0,
      };
    });

    setQueue((prev) => [...prev, ...newItems]);
  };

  const removeItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item?.outputUrl) URL.revokeObjectURL(item.outputUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const clearAll = () => {
    queue.forEach((item) => {
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
    });
    setQueue([]);
  };

  const processAll = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'completed') continue;

      setQueue((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'converting', progress: 15 } : it))
      );

      try {
        const baseName = item.file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');

        if (item.mode === 'mp4-to-mp3') {
          let blob: Blob | null = null;
          if (!isAndroidApk()) {
            try {
              const formData = new FormData();
              formData.append('file', item.file);
              formData.append('bitrate', '320k');
              formData.append('sampleRate', '44100');
              formData.append('channels', '2');
              const res = await fetch('/api/convert/mp4-to-mp3', { method: 'POST', body: formData });
              if (res.ok) blob = await res.blob();
            } catch {
              // fallback below
            }
          }

          if (!blob) {
            const audioBuffer = await extractAudioFromVideoLocal(item.file);
            blob = await audioBufferToMp3(audioBuffer, 192);
          }

          const url = URL.createObjectURL(blob);
          const outName = `${baseName || 'audio'}.mp3`;

          setQueue((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: 'completed',
                    progress: 100,
                    outputBlob: blob!,
                    outputUrl: url,
                    outputName: outName,
                    outputSize: blob!.size,
                  }
                : it
            )
          );
        } else {
          let blob: Blob | null = null;
          let ext = 'mp4';

          if (!isAndroidApk()) {
            try {
              const formData = new FormData();
              formData.append('file', item.file);
              const res = await fetch('/api/convert/mp3-to-mp4', { method: 'POST', body: formData });
              if (res.ok) blob = await res.blob();
            } catch {
              // fallback below
            }
          }

          if (!blob) {
            const blackImg = await createBlackImageFile();
            const result = await synthesizeLandscapeVideoClient(item.file, blackImg);
            blob = result.blob;
            ext = result.extension;
          }

          const url = URL.createObjectURL(blob);
          const outName = `${baseName || 'video'}.${ext}`;

          setQueue((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: 'completed',
                    progress: 100,
                    outputBlob: blob!,
                    outputUrl: url,
                    outputName: outName,
                    outputSize: blob!.size,
                  }
                : it
            )
          );
        }
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'error', error: err.message || 'Failed' }
              : it
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const completedCount = queue.filter((x) => x.status === 'completed').length;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Upload multiple */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        className="group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-800 hover:border-white rounded-2xl bg-neutral-950/60 hover:bg-neutral-900/50 transition-all cursor-pointer text-center select-none"
      >
        <input
          ref={fileInputRef}
          id="batch-file-input"
          type="file"
          multiple
          accept="video/*,audio/*,.mp4,.mp3,.wav,.mov,.mkv,.webm"
          className="hidden"
          onClick={(e) => {
            (e.target as HTMLInputElement).value = '';
          }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 text-white shadow-lg mb-3 group-hover:scale-105 transition-transform">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white">
          Select Files
        </h3>
      </div>

      {/* Queue Table */}
      {queue.length > 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Queue ({queue.length} items)
              </span>
              <span className="text-xs font-mono text-neutral-400">
                · {completedCount}/{queue.length} completed
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={isProcessing}
                onClick={clearAll}
                className="flex items-center gap-1 text-xs font-mono text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Items list */}
          <div className="divide-y divide-neutral-900">
            {queue.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 text-white">
                    {item.mode === 'mp4-to-mp3' ? (
                      <FileVideo className="w-4 h-4 text-neutral-300" />
                    ) : (
                      <FileAudio className="w-4 h-4 text-neutral-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate max-w-sm">
                      {item.file.name}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400">
                      <span>{formatBytes(item.file.size)}</span>
                      <span>→</span>
                      <span className="text-white font-medium uppercase">
                        {item.mode === 'mp4-to-mp3' ? 'MP3 Audio' : 'MP4 Video'}
                      </span>
                      {item.outputSize && (
                        <span>({formatBytes(item.outputSize)})</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.status === 'queued' && (
                    <span className="text-[11px] font-mono text-neutral-500">Queued</span>
                  )}
                  {item.status === 'converting' && (
                    <span className="text-[11px] font-mono text-white flex items-center gap-1">
                      <span className="animate-spin">∞</span> Converting
                    </span>
                  )}
                  {item.status === 'completed' && item.outputBlob && (
                    <button
                      type="button"
                      onClick={() => downloadMedia(item.outputBlob!, item.outputName || 'audio.mp3')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  )}
                  {item.status === 'error' && (
                    <span className="text-[11px] font-mono text-red-400">Failed</span>
                  )}

                  {!isProcessing && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-neutral-500 hover:text-white p-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
            <button
              disabled={isProcessing || queue.every((x) => x.status === 'completed')}
              onClick={processAll}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer shadow-lg"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>{isProcessing ? 'Processing Queue...' : `Convert All (${queue.length} files)`}</span>
            </button>

            {completedCount > 0 && (
              <div className="text-xs font-mono text-neutral-400">
                {completedCount} file{completedCount > 1 ? 's' : ''} ready
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
