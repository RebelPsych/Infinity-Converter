# ∞ Infinity Converter

> Minimalist high-contrast media converter for MP4 to MP3 and MP3 to MP4 with visualizers and audio tools.

[![Android Release](https://img.shields.io/badge/Android-APK%20Ready-black.svg?style=flat&logo=android)](releases/infinity-converter-v1.0.0.apk)
[![Build](https://img.shields.io/badge/Build-Passing-black.svg?style=flat)]()
[![License](https://img.shields.io/badge/License-Apache--2.0-black.svg?style=flat)]()

---

## ⚡ Features

- **MP4 to MP3 Extraction**: Studio-grade 320 kbps MP3 encoding powered by FFmpeg with custom bitrates (320k, 256k, 192k, 128k), sample rate tuning, channel selection, ID3 metadata tags, and time trimming.
- **MP3 to MP4 Synthesis**: Transform audio tracks into video with real-time geometric visualizers:
  - *∞ Infinity Resonance*: Lissajous resonant vector loop synced to harmonic frequencies.
  - *Monochrome Spectrum*: Clean vertical frequency bars.
  - *Circular Sound Orbit*: Concentric soundwave pulses.
  - *Oscilloscope*: Ultra-fine sine waveform oscillograph.
  - Custom Cover Artwork overlay & typographic cards.
- **Batch Processing**: Convert whole albums or playlists simultaneously with ZIP download.
- **Dual Engine**:
  - *FFmpeg Studio Engine*: Server-side lossless speed.
  - *Web Audio Local Engine*: 100% offline client-side fallback.
- **High Contrast Minimalist UI**: High contrast black & white design with zero pill clutter, tabular telemetry, and responsive touch controls.

---

## 📱 Android APK Installation

The pre-compiled Android APK is available in the `releases/` folder:

- **File**: `infinity-converter-v1.0.0.apk`
- **SHA-256**: `af2327a6478b347cc798be72f0253edf00ed8eaa9ed83d757017ea11e6306c4c`

### Quick Install Steps:
1. Transfer the `.apk` file to your Android device (or download directly via browser).
2. Open your device **Settings > Security** (or **Apps**) and toggle **"Install from unknown sources"**.
3. Tap the downloaded APK to install **Infinity Converter**.

---

## 💻 Web & Server Development

### Prerequisites
- Node.js 18+
- FFmpeg (for studio server conversion)

```bash
# Install dependencies
npm install

# Start development full-stack server
npm run dev

# Build for production
npm run build
```

---

## 📦 Android Build from Source

```bash
# Generate classes.dex and package APK with AAPT
./scripts/build-apk.sh
```
