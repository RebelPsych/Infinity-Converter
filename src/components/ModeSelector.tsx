import React from 'react';
import { Music, Video, Layers } from 'lucide-react';
import { ConversionMode } from '../types';

interface ModeSelectorProps {
  currentMode: ConversionMode;
  onSelectMode: (mode: ConversionMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onSelectMode,
}) => {
  return (
    <div className="flex justify-center my-6">
      <div className="inline-flex p-1.5 rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80 light:border-neutral-300 light:bg-neutral-100 shadow-xl">
        <button
          onClick={() => onSelectMode('mp4-to-mp3')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            currentMode === 'mp4-to-mp3'
              ? 'bg-white text-black shadow-md dark:bg-white dark:text-black light:bg-black light:text-white'
              : 'text-neutral-400 hover:text-white dark:text-neutral-400 dark:hover:text-white light:text-neutral-600 light:hover:text-black'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>MP4 → MP3</span>
        </button>

        <button
          onClick={() => onSelectMode('mp3-to-mp4')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            currentMode === 'mp3-to-mp4'
              ? 'bg-white text-black shadow-md dark:bg-white dark:text-black light:bg-black light:text-white'
              : 'text-neutral-400 hover:text-white dark:text-neutral-400 dark:hover:text-white light:text-neutral-600 light:hover:text-black'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>MP3 → MP4</span>
        </button>

        <button
          onClick={() => onSelectMode('batch')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            currentMode === 'batch'
              ? 'bg-white text-black shadow-md dark:bg-white dark:text-black light:bg-black light:text-white'
              : 'text-neutral-400 hover:text-white dark:text-neutral-400 dark:hover:text-white light:text-neutral-600 light:hover:text-black'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Batch</span>
        </button>
      </div>
    </div>
  );
};
