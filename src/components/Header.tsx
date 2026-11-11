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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-purple-900/60 bg-neutral-950 p-1 shadow-inner">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
              <path d="M 48 53 C 38 65, 30 68, 23 68 C 13 68, 8 60, 8 50 C 8 40, 13 32, 23 32 C 32 32, 43 38, 53 50 C 59 56, 67 62, 74 62" stroke="#a855f7" strokeWidth="9" strokeLinecap="round" />
              <path d="M 74 62 L 66 68 L 68 56 Z" fill="#c084fc" />
              <path d="M 53 47 C 63 35, 71 32, 78 32 C 88 32, 93 40, 93 50 C 93 60, 88 68, 78 68 C 69 68, 58 62, 48 50 C 42 44, 34 38, 27 38" stroke="#c084fc" strokeWidth="9" strokeLinecap="round" />
              <path d="M 27 38 L 35 32 L 33 44 Z" fill="#e9d5ff" />
            </svg>
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
