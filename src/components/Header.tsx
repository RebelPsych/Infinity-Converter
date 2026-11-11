import React from 'react';
import { Smartphone } from 'lucide-react';
import { ConversionMode } from '../types';

interface HeaderProps {
  currentMode: ConversionMode;
  onSelectMode: (mode: ConversionMode) => void;
  onOpenApkModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  onOpenApkModal,
}) => {
  return (
    <header className="w-full border-b border-neutral-900 bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        
        {/* Mode Selector Tabs (No logo, no text ad) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950 border border-neutral-800">
          <button
            onClick={() => onSelectMode('mp4-to-mp3')}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              currentMode === 'mp4-to-mp3'
                ? 'bg-white text-black shadow-md font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            MP4 → MP3
          </button>
          <button
            onClick={() => onSelectMode('mp3-to-mp4')}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              currentMode === 'mp3-to-mp4'
                ? 'bg-white text-black shadow-md font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            MP3 → MP4
          </button>
          <button
            onClick={() => onSelectMode('batch')}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              currentMode === 'batch'
                ? 'bg-white text-black shadow-md font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Batch
          </button>
        </div>

        {/* Action Button: Download APK */}
        <button
          onClick={onOpenApkModal}
          className="flex items-center gap-2 rounded-lg bg-neutral-900 border border-neutral-700 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span>Download APK</span>
        </button>
      </div>
    </header>
  );
};
