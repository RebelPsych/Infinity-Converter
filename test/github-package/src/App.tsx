import React, { useState } from 'react';
import { Header } from './components/Header';
import { Mp4ToMp3Converter } from './components/Mp4ToMp3Converter';
import { Mp3ToMp4Converter } from './components/Mp3ToMp4Converter';
import { BatchConverter } from './components/BatchConverter';
import { ApkGitHubModal } from './components/ApkGitHubModal';
import { ConversionMode } from './types';

export default function App() {
  const [currentMode, setCurrentMode] = useState<ConversionMode>('mp4-to-mp3');
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-white selection:text-black">
      {/* Minimal Header with Mode Selector and Download APK */}
      <Header
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        onOpenApkModal={() => setIsApkModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        <div className="transition-all duration-200">
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
    </div>
  );
}
