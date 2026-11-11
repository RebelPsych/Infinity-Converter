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
          <span className="text-white font-bold text-sm">∞</span>
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
