import React from 'react';
import { Smartphone, Github, Moon, Sun, Download } from 'lucide-react';
import { ConversionMode } from '../types';

interface HeaderProps {
  currentMode: ConversionMode;
  onSelectMode: (mode: ConversionMode) => void;
  onOpenApkModal: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  onOpenApkModal,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-black/90 backdrop-blur-md dark:border-neutral-800 dark:bg-black/90 light:border-neutral-200 light:bg-white/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        
        {/* Zone 1: Single text element wordmark with Infinity logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 text-white font-mono text-xl shadow-inner dark:border-neutral-700 dark:bg-neutral-900 dark:text-white light:border-neutral-300 light:bg-neutral-100 light:text-black">
            ∞
          </div>
          <a
            href="/"
            className="text-base font-bold tracking-tight text-white transition-opacity hover:opacity-80 dark:text-white light:text-black whitespace-nowrap shrink-0"
          >
            INFINITY CONVERTER
          </a>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-400 light:text-neutral-600">
          <button
            onClick={() => onSelectMode('mp4-to-mp3')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentMode === 'mp4-to-mp3'
                ? 'text-white dark:text-white light:text-black font-semibold underline underline-offset-8'
                : 'hover:text-white dark:hover:text-white light:hover:text-black'
            }`}
          >
            MP4 → MP3
          </button>
          <button
            onClick={() => onSelectMode('mp3-to-mp4')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentMode === 'mp3-to-mp4'
                ? 'text-white dark:text-white light:text-black font-semibold underline underline-offset-8'
                : 'hover:text-white dark:hover:text-white light:hover:text-black'
            }`}
          >
            MP3 → MP4
          </button>
          <button
            onClick={() => onSelectMode('batch')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentMode === 'batch'
                ? 'text-white dark:text-white light:text-black font-semibold underline underline-offset-8'
                : 'hover:text-white dark:hover:text-white light:hover:text-black'
            }`}
          >
            Batch
          </button>
          <button
            onClick={onOpenApkModal}
            className="hover:text-white dark:hover:text-white light:hover:text-black transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Github className="w-3.5 h-3.5" />
            <span>APK &amp; GitHub</span>
          </button>
        </nav>

        {/* Zone 3: Primary action button + Theme Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleTheme}
            aria-label="Toggle Theme"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-white light:border-neutral-300 light:bg-neutral-100 light:text-neutral-700 light:hover:text-black transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={onOpenApkModal}
            className="flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-black transition-transform active:scale-95 hover:bg-neutral-200 dark:bg-white dark:text-black dark:hover:bg-neutral-200 light:bg-black light:text-white light:hover:bg-neutral-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Download APK</span>
          </button>
        </div>
      </div>
    </header>
  );
};
