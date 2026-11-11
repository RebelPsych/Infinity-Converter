import React from 'react';
import {
  Smartphone,
  Github,
  Download,
  X,
  CheckCircle,
  FileCode,
  Terminal,
  ShieldCheck,
  FolderArchive,
  ArrowRight,
} from 'lucide-react';

interface ApkGitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkGitHubModal: React.FC<ApkGitHubModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-950 p-6 md:p-8 text-white shadow-2xl space-y-6"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Modal"
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 text-white font-mono text-2xl shadow-inner">
            ∞
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Android APK & GitHub Package
            </h2>
            <p className="text-xs text-neutral-400">
              Generated in folder <code className="text-white font-mono">/test</code> with verified signature
            </p>
          </div>
        </div>

        {/* Status Banner */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 text-xs font-mono">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>APK compiled, AAPT aligned, signed with Android key, and verified in /test.</span>
        </div>

        {/* Download Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* APK Card */}
          <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-white" />
                Android Package (.apk)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Native Android APK with offline media processing and hardware accelerated Web Audio.
            </p>
            <div className="text-[11px] font-mono text-neutral-500 truncate">
              Path: /test/infinity-converter.apk
            </div>
            <a
              href="/api/download/apk"
              download="infinity-converter.apk"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black hover:bg-neutral-200 transition-colors shadow-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download APK</span>
            </a>
          </div>

          {/* GitHub Package Card */}
          <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <FolderArchive className="w-4 h-4 text-white" />
                GitHub Release (.zip)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                Ready for Git
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Complete source repository, README.md, APK release, Android source, and build scripts.
            </p>
            <div className="text-[11px] font-mono text-neutral-500 truncate">
              Path: /test/infinity-converter-github.zip
            </div>
            <a
              href="/api/download/github-package"
              download="infinity-converter-github.zip"
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors shadow-lg"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Download GitHub Zip</span>
            </a>
          </div>
        </div>

        {/* Installation Instructions for Device */}
        <div className="space-y-3 p-4 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-white" />
            Android Device Installation Steps
          </span>
          <ol className="text-xs text-neutral-300 space-y-2 list-decimal list-inside font-mono">
            <li>Download the <strong className="text-white">infinity-converter.apk</strong> above.</li>
            <li>On your Android phone/tablet, open <strong className="text-white">Settings &gt; Security &gt; Install Unknown Apps</strong>.</li>
            <li>Enable installation for your browser or file manager.</li>
            <li>Tap the APK notification to install and launch <strong className="text-white">Infinity Converter</strong>.</li>
          </ol>
        </div>

        {/* GitHub Package Structure */}
        <div className="space-y-2">
          <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-white" />
            Included in GitHub Package
          </span>
          <div className="p-3 rounded-xl border border-neutral-800 bg-black text-neutral-400 font-mono text-[11px] space-y-1">
            <div className="text-white font-bold">/test/github-package/</div>
            <div>├── releases/infinity-converter-v1.0.0.apk  (Signed Android APK)</div>
            <div>├── android/AndroidManifest.xml           (Android manifest)</div>
            <div>├── android/src/MainActivity.java          (Android WebView host)</div>
            <div>├── src/                                   (React + Vite source)</div>
            <div>├── server.ts                              (Express + FFmpeg API)</div>
            <div>├── README.md                              (GitHub badges & docs)</div>
            <div>└── package.json                           (Dependencies)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
