#!/usr/bin/env bash
set -e

echo "=== Building Infinity Converter Android APK & GitHub Package ==="

ROOT_DIR="/app/applet"
TEST_DIR="$ROOT_DIR/test"
BUILD_DIR="$TEST_DIR/build-tmp"
ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"

mkdir -p "$TEST_DIR"
mkdir -p "$BUILD_DIR/src/com/infinity/converter"
mkdir -p "$BUILD_DIR/res/values"
mkdir -p "$BUILD_DIR/res/drawable"
mkdir -p "$BUILD_DIR/assets"

# 1. Build Vite web assets first
echo "[1/7] Building web production assets with Vite..."
cd "$ROOT_DIR"
npm run build

echo "[2/7] Copying built web bundle into Android assets..."
cp -r "$ROOT_DIR/dist/"* "$BUILD_DIR/assets/"

# 2. Create AndroidManifest.xml
echo "[3/7] Generating AndroidManifest.xml..."
cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.infinity.converter"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:label="@string/app_name"
        android:icon="@drawable/ic_launcher"
        android:allowBackup="true"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar">
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# 3. Create strings.xml and icon
cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Infinity Converter</string>
</resources>
EOF

# Generate a clean monochrome 144x144 png launcher icon with ffmpeg
ffmpeg -y -f lavfi -i "color=c=black:s=144x144" -vf "drawtext=text='∞':fontsize=96:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" -frames:v 1 "$BUILD_DIR/res/drawable/ic_launcher.png" >/dev/null 2>&1 || \
ffmpeg -y -f lavfi -i "color=c=black:s=144x144" -frames:v 1 "$BUILD_DIR/res/drawable/ic_launcher.png"

# 4. Create MainActivity.java
echo "[4/7] Generating MainActivity.java..."
cat << 'EOF' > "$BUILD_DIR/src/com/infinity/converter/MainActivity.java"
package com.infinity.converter;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.graphics.Color;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());

        // Load offline local application bundle
        webView.loadUrl("file:///android_asset/index.html");

        setContentView(webView);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
EOF

# 5. Compile Java to class files
echo "[5/7] Compiling Java classes with javac..."
javac -cp "$ANDROID_JAR" -d "$BUILD_DIR/bin" -source 1.8 -target 1.8 "$BUILD_DIR/src/com/infinity/converter/MainActivity.java"

# 6. Convert classes to Dalvik executable (classes.dex)
echo "[6/7] Converting to classes.dex using dalvik-exchange..."
dalvik-exchange --dex --output="$BUILD_DIR/classes.dex" "$BUILD_DIR/bin"

# 7. Package resources and assets into APK with AAPT
echo "[7/7] Packaging APK with AAPT and signing with apksigner..."
aapt package -f \
    -M "$BUILD_DIR/AndroidManifest.xml" \
    -S "$BUILD_DIR/res" \
    -A "$BUILD_DIR/assets" \
    -I "$ANDROID_JAR" \
    -F "$BUILD_DIR/unaligned.apk"

# Add classes.dex into unaligned.apk
cd "$BUILD_DIR"
zip -u unaligned.apk classes.dex

# Zipalign to 4 bytes
zipalign -f -p 4 unaligned.apk "$BUILD_DIR/aligned.apk"

# Generate debug keystore if not exists
if [ ! -f "$TEST_DIR/debug.keystore" ]; then
    keytool -genkeypair -v \
        -keystore "$TEST_DIR/debug.keystore" \
        -storepass android \
        -alias androiddebugkey \
        -keypass android \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -dname "CN=Infinity Converter, OU=Mobile, O=Infinity, L=San Francisco, ST=California, C=US"
fi

# Sign APK
apksigner sign \
    --ks "$TEST_DIR/debug.keystore" \
    --ks-pass pass:android \
    --ks-key-alias androiddebugkey \
    --out "$TEST_DIR/infinity-converter.apk" \
    "$BUILD_DIR/aligned.apk"

# Also create versioned release apk
cp "$TEST_DIR/infinity-converter.apk" "$TEST_DIR/InfinityConverter-v1.0.0.apk"

# Verify APK
apksigner verify "$TEST_DIR/infinity-converter.apk"
echo "✅ APK signature verified successfully!"

# 8. Create GitHub Package distribution in test/
echo "=== Packaging GitHub Release Bundle ==="
GITHUB_DIR="$TEST_DIR/github-package"
rm -rf "$GITHUB_DIR"
mkdir -p "$GITHUB_DIR"

# Copy source repository contents
cp -r "$ROOT_DIR/src" "$GITHUB_DIR/"
cp "$ROOT_DIR/package.json" "$GITHUB_DIR/"
cp "$ROOT_DIR/tsconfig.json" "$GITHUB_DIR/"
cp "$ROOT_DIR/vite.config.ts" "$GITHUB_DIR/"
cp "$ROOT_DIR/server.ts" "$GITHUB_DIR/"
cp "$ROOT_DIR/index.html" "$GITHUB_DIR/"
cp "$ROOT_DIR/.gitignore" "$GITHUB_DIR/"
cp "$ROOT_DIR/metadata.json" "$GITHUB_DIR/"

mkdir -p "$GITHUB_DIR/android"
cp -r "$BUILD_DIR/src" "$GITHUB_DIR/android/"
cp -r "$BUILD_DIR/res" "$GITHUB_DIR/android/"
cp "$BUILD_DIR/AndroidManifest.xml" "$GITHUB_DIR/android/"

mkdir -p "$GITHUB_DIR/releases"
cp "$TEST_DIR/infinity-converter.apk" "$GITHUB_DIR/releases/infinity-converter-v1.0.0.apk"

# Compute SHA256 checksum
APK_SHA256=$(sha256sum "$TEST_DIR/infinity-converter.apk" | awk '{print $1}')

cat << EOF > "$GITHUB_DIR/README.md"
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

The pre-compiled Android APK is available in the \`releases/\` folder:

- **File**: \`infinity-converter-v1.0.0.apk\`
- **SHA-256**: \`${APK_SHA256}\`

### Quick Install Steps:
1. Transfer the \`.apk\` file to your Android device (or download directly via browser).
2. Open your device **Settings > Security** (or **Apps**) and toggle **"Install from unknown sources"**.
3. Tap the downloaded APK to install **Infinity Converter**.

---

## 💻 Web & Server Development

### Prerequisites
- Node.js 18+
- FFmpeg (for studio server conversion)

\`\`\`bash
# Install dependencies
npm install

# Start development full-stack server
npm run dev

# Build for production
npm run build
\`\`\`

---

## 📦 Android Build from Source

\`\`\`bash
# Generate classes.dex and package APK with AAPT
./scripts/build-apk.sh
\`\`\`
EOF

# Zip GitHub release package
cd "$TEST_DIR"
rm -f infinity-converter-github.zip
zip -r infinity-converter-github.zip github-package >/dev/null

echo "=========================================================="
echo "🎉 SUCCESS: Android APK and GitHub package ready in /test!"
echo "APK Path: $TEST_DIR/infinity-converter.apk"
echo "GitHub Package: $TEST_DIR/infinity-converter-github.zip"
echo "SHA256: $APK_SHA256"
echo "=========================================================="
