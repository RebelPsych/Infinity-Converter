import React from 'react';
import { Github, Smartphone } from 'lucide-react';

interface FooterProps {
  onOpenApkModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenApkModal }) => {
  return (
    <footer className="mt-20 border-t border-neutral-800 bg-black/60 dark:border-neutral-800 dark:bg-black/60 light:border-neutral-200 light:bg-neutral-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-neutral-500 font-mono">
        <div className="flex items-center gap-2 text-neutral-400">
          <svg viewBox="0 0 100 100" className="w-4 h-4 shrink-0" fill="none">
            <path d="M 48 53 C 38 65, 30 68, 23 68 C 13 68, 8 60, 8 50 C 8 40, 13 32, 23 32 C 32 32, 43 38, 53 50 C 59 56, 67 62, 74 62" stroke="#a855f7" strokeWidth="10" strokeLinecap="round" />
            <path d="M 74 62 L 66 68 L 68 56 Z" fill="#c084fc" />
            <path d="M 53 47 C 63 35, 71 32, 78 32 C 88 32, 93 40, 93 50 C 93 60, 88 68, 78 68 C 69 68, 58 62, 48 50 C 42 44, 34 38, 27 38" stroke="#c084fc" strokeWidth="10" strokeLinecap="round" />
            <path d="M 27 38 L 35 32 L 33 44 Z" fill="#e9d5ff" />
          </svg>
          <span className="font-semibold text-white">INFINITY CONVERTER</span>
          <span aria-hidden="true">·</span>
          <span>Minimalist High-Contrast Media Engine</span>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={onOpenApkModal}
            className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android APK (/test)</span>
          </button>
          <button
            onClick={onOpenApkModal}
            className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Release</span>
          </button>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
};
