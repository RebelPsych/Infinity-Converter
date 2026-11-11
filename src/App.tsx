import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { Mp4ToMp3Converter } from './components/Mp4ToMp3Converter';
import { Mp3ToMp4Converter } from './components/Mp3ToMp4Converter';
import { BatchConverter } from './components/BatchConverter';
import { ApkGitHubModal } from './components/ApkGitHubModal';
import { Footer } from './components/Footer';
import { ConversionMode } from './types';


export default function App() {
  const [currentMode, setCurrentMode] = useState<ConversionMode>('mp4-to-mp3');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  // Sync theme with <html> class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="min-h-screen bg-black text-white dark:bg-black dark:text-white light:bg-white light:text-black flex flex-col selection:bg-white selection:text-black transition-colors duration-200">
      {/* Top Bar Header */}
      <Header
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        onOpenApkModal={() => setIsApkModalOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        


        {/* Segmented Mode Selector */}
        <ModeSelector currentMode={currentMode} onSelectMode={setCurrentMode} />

        {/* Dynamic Converter Section */}
        <div className="transition-all duration-300">
          {currentMode === 'mp4-to-mp3' && <Mp4ToMp3Converter />}
          {currentMode === 'mp3-to-mp4' && <Mp3ToMp4Converter />}
          {currentMode === 'batch' && <BatchConverter />}
        </div>
      </main>

      {/* APK & GitHub Modal */}
      <ApkGitHubModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />

      {/* Footer */}
      <Footer onOpenApkModal={() => setIsApkModalOpen(true)} />
    </div>
  );
}
