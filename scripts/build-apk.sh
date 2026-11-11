#!/usr/bin/env bash
set -e

echo "=== Building Infinity Converter Android APK & GitHub Package ==="

ROOT_DIR="/app/applet"
TEST_DIR="$ROOT_DIR/test"
BUILD_DIR="$TEST_DIR/build-tmp"
ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"

mkdir -p "$TEST_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/src/com/infinity/converter"
mkdir -p "$BUILD_DIR/res/values"
mkdir -p "$BUILD_DIR/res/drawable"
mkdir -p "$BUILD_DIR/res/drawable-mdpi"
mkdir -p "$BUILD_DIR/res/drawable-hdpi"
mkdir -p "$BUILD_DIR/res/drawable-xhdpi"
mkdir -p "$BUILD_DIR/res/drawable-xxhdpi"
mkdir -p "$BUILD_DIR/res/drawable-xxxhdpi"
mkdir -p "$BUILD_DIR/assets"
mkdir -p "$BUILD_DIR/bin"

# 1. Build Vite web assets with relative base './'
echo "[1/8] Building web production bundle with Vite..."
cd "$ROOT_DIR"
npm run build

echo "[2/8] Copying web bundle into Android assets..."
cp -r "$ROOT_DIR/dist/"* "$BUILD_DIR/assets/"

# 2. Generate purple infinity logo with two arrows in multiple resolutions
echo "[3/8] Generating purple infinity arrow app icons..."
rsvg-convert -w 48 -h 48 "$ROOT_DIR/scripts/app-icon.svg" -o "$BUILD_DIR/res/drawable-mdpi/ic_launcher.png"
rsvg-convert -w 72 -h 72 "$ROOT_DIR/scripts/app-icon.svg" -o "$BUILD_DIR/res/drawable-hdpi/ic_launcher.png"
rsvg-convert -w 96 -h 96 "$ROOT_DIR/scripts/app-icon.svg" -o "$BUILD_DIR/res/drawable-xhdpi/ic_launcher.png"
rsvg-convert -w 144 -h 144 "$ROOT_DIR/scripts/app-icon.svg" -o "$BUILD_DIR/res/drawable-xxhdpi/ic_launcher.png"
rsvg-convert -w 192 -h 192 "$ROOT_DIR/scripts/app-icon.svg" -o "$BUILD_DIR/res/drawable-xxxhdpi/ic_launcher.png"
cp "$BUILD_DIR/res/drawable-xxhdpi/ic_launcher.png" "$BUILD_DIR/res/drawable/ic_launcher.png"

# Copy icon into public dist folder as well
cp "$BUILD_DIR/res/drawable-xxxhdpi/ic_launcher.png" "$ROOT_DIR/dist/app-icon.png" 2>/dev/null || true

# 3. Create AndroidManifest.xml
echo "[4/8] Generating AndroidManifest.xml..."
cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.infinity.converter"
    android:versionCode="2"
    android:versionName="1.1.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

    <application
        android:label="@string/app_name"
        android:icon="@drawable/ic_launcher"
        android:allowBackup="true"
        android:supportsRtl="true"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:windowSoftInputMode="adjustResize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# 4. Create strings.xml
cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Infinity Converter</string>
</resources>
EOF

# 5. Create MainActivity.java with robust local asset interceptor
echo "[5/8] Generating robust MainActivity.java..."
cat << 'EOF' > "$BUILD_DIR/src/com/infinity/converter/MainActivity.java"
package com.infinity.converter;

import android.app.Activity;
import android.os.Bundle;
import android.net.Uri;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.graphics.Color;
import java.io.InputStream;
import java.util.Map;
import java.util.HashMap;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#09090b"));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Custom WebViewClient intercepting https://infinity.local to prevent module CORS issues
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    return handleAssetRequest(request.getUrl());
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                if (url != null) {
                    return handleAssetRequest(Uri.parse(url));
                }
                return super.shouldInterceptRequest(view, url);
            }

            private WebResourceResponse handleAssetRequest(Uri uri) {
                String host = uri.getHost();
                if ("infinity.local".equalsIgnoreCase(host) || "appassets.androidplatform.net".equalsIgnoreCase(host)) {
                    String path = uri.getPath();
                    if (path == null || path.isEmpty() || "/".equals(path)) {
                        path = "index.html";
                    }
                    if (path.startsWith("/")) {
                        path = path.substring(1);
                    }
                    try {
                        InputStream is = getAssets().open(path);
                        String mime = "application/octet-stream";
                        if (path.endsWith(".html")) mime = "text/html";
                        else if (path.endsWith(".js") || path.endsWith(".mjs")) mime = "application/javascript";
                        else if (path.endsWith(".css")) mime = "text/css";
                        else if (path.endsWith(".png")) mime = "image/png";
                        else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) mime = "image/jpeg";
                        else if (path.endsWith(".svg")) mime = "image/svg+xml";
                        else if (path.endsWith(".json")) mime = "application/json";

                        Map<String, String> headers = new HashMap<String, String>();
                        headers.put("Access-Control-Allow-Origin", "*");
                        headers.put("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                        return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, is);
                    } catch (Exception e) {
                        // File not in root of assets, try prepending assets/
                        try {
                            InputStream is2 = getAssets().open("assets/" + path);
                            Map<String, String> headers = new HashMap<String, String>();
                            headers.put("Access-Control-Allow-Origin", "*");
                            return new WebResourceResponse("application/octet-stream", "UTF-8", 200, "OK", headers, is2);
                        } catch (Exception ignored) {}
                    }
                }
                return null;
            }
        });

        webView.setWebChromeClient(new WebChromeClient());

        // Load via virtual secure local domain so ES Modules, CORS, and LocalStorage run with zero errors
        webView.loadUrl("https://infinity.local/index.html");

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

# 6. Compile Java to class files
echo "[6/8] Compiling Java classes with javac..."
javac -cp "$ANDROID_JAR" -d "$BUILD_DIR/bin" -source 1.8 -target 1.8 "$BUILD_DIR/src/com/infinity/converter/MainActivity.java"

# 7. Convert classes to Dalvik executable (classes.dex)
echo "[7/8] Converting to classes.dex using dalvik-exchange..."
dalvik-exchange --dex --output="$BUILD_DIR/classes.dex" "$BUILD_DIR/bin"

# 8. Package resources and assets into APK with AAPT
echo "[8/8] Packaging APK with AAPT and signing with apksigner..."
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

# Sign APK
apksigner sign \
    --ks "$TEST_DIR/debug.keystore" \
    --ks-pass pass:android \
    --ks-key-alias androiddebugkey \
    --out "$TEST_DIR/infinity-converter.apk" \
    "$BUILD_DIR/aligned.apk"

# Also create versioned release apk
cp "$TEST_DIR/infinity-converter.apk" "$TEST_DIR/InfinityConverter-v1.1.0.apk"
cp "$TEST_DIR/infinity-converter.apk" "$TEST_DIR/InfinityConverter-v1.0.0.apk"

# Verify APK
apksigner verify "$TEST_DIR/infinity-converter.apk"
echo "✅ APK signature verified successfully!"

# 9. Create GitHub Package distribution in test/
echo "=== Packaging GitHub Release Bundle ==="
GITHUB_DIR="$TEST_DIR/github-package"
rm -rf "$GITHUB_DIR"
mkdir -p "$GITHUB_DIR"

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
cp "$TEST_DIR/infinity-converter.apk" "$GITHUB_DIR/releases/infinity-converter.apk"

APK_SHA256=$(sha256sum "$TEST_DIR/infinity-converter.apk" | awk '{print $1}')

cat << EOF > "$GITHUB_DIR/README.md"
# ∞ Infinity Converter

Minimalist media converter for MP4 to MP3 and MP3 to 16:9 landscape MP4.

[![Android Release](https://img.shields.io/badge/Android-APK%20Ready-purple.svg?style=flat&logo=android)](releases/infinity-converter.apk)
[![Build](https://img.shields.io/badge/Build-Passing-black.svg?style=flat)]()

## Features
- MP4 to MP3 Audio Extraction (320 kbps LAME)
- MP3 to 16:9 Landscape MP4 (formatted for viewing with image and audio)
- Batch Processing
- Offline Android APK with Purple Infinity Two-Arrow Logo

## Android APK
- Location: \`releases/infinity-converter.apk\`
- SHA256: \`${APK_SHA256}\`
EOF

cd "$TEST_DIR"
rm -f infinity-converter-github.zip
zip -r infinity-converter-github.zip github-package >/dev/null

echo "=========================================================="
echo "🎉 SUCCESS: Android APK and GitHub package ready in /test!"
echo "APK Path: $TEST_DIR/infinity-converter.apk"
echo "Icon: Purple infinity logo made with two arrows"
echo "SHA256: $APK_SHA256"
echo "=========================================================="
