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
echo "[5/8] Generating robust MainActivity.java with native file chooser and MediaStore downloads..."
cat << 'EOF' > "$BUILD_DIR/src/com/infinity/converter/MainActivity.java"
package com.infinity.converter;

import android.app.Activity;
import android.os.Bundle;
import android.os.Build;
import android.os.Environment;
import android.net.Uri;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.ValueCallback;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.content.Intent;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.widget.Toast;
import android.util.Base64;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> mFilePathCallback;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;
    private static final int CREATE_DOCUMENT_REQUEST_CODE = 1002;
    private static final int STORAGE_PERMISSION_REQUEST_CODE = 1003;

    private File pendingExportTempFile;
    private final Map<String, SaveSession> saveSessions = new HashMap<String, SaveSession>();

    private static class SaveSession {
        File tempFile;
        String filename;
        String mimeType;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Request legacy storage permission on Android 6-9
        if (Build.VERSION.SDK_INT >= 23 && Build.VERSION.SDK_INT < 29) {
            if (checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{
                    android.Manifest.permission.WRITE_EXTERNAL_STORAGE,
                    android.Manifest.permission.READ_EXTERNAL_STORAGE
                }, STORAGE_PERMISSION_REQUEST_CODE);
            }
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#000000"));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

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

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;

                Intent intent = null;
                if (fileChooserParams != null) {
                    intent = fileChooserParams.createIntent();
                }
                if (intent == null) {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }

                if (fileChooserParams != null && fileChooserParams.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) {
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                }

                try {
                    startActivityForResult(Intent.createChooser(intent, "Select Files"), FILE_CHOOSER_REQUEST_CODE);
                    return true;
                } catch (Exception e) {
                    if (mFilePathCallback != null) {
                        mFilePathCallback.onReceiveValue(null);
                        mFilePathCallback = null;
                    }
                    return false;
                }
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                if (url != null && url.startsWith("blob:")) {
                    String safeMime = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "application/octet-stream";
                    String safeName = "infinity_output";
                    if (safeMime.contains("audio") || safeMime.contains("mpeg")) safeName += ".mp3";
                    else if (safeMime.contains("mp4") || safeMime.contains("video")) safeName += ".mp4";
                    String js = "(function(){fetch('" + url + "').then(function(r){return r.blob();}).then(function(b){var fr=new FileReader();fr.onloadend=function(){var res=fr.result;if(res&&res.indexOf(',')>-1){window.AndroidBridge.downloadBase64(res.split(',')[1],'" + safeName + "','" + safeMime + "');}};fr.readAsDataURL(b);});})();";
                    webView.evaluateJavascript(js, null);
                }
            }
        });

        // Bridge supporting both chunked transfers (large files) and single-shot base64
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public String startFileSave(String filename, String mimeType) {
                try {
                    String id = UUID.randomUUID().toString();
                    File temp = new File(getCacheDir(), "dl_" + id);
                    if (temp.exists()) temp.delete();
                    SaveSession s = new SaveSession();
                    s.tempFile = temp;
                    s.filename = sanitizeFilename(filename);
                    s.mimeType = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "application/octet-stream";
                    synchronized (saveSessions) {
                        saveSessions.put(id, s);
                    }
                    return id;
                } catch (Exception e) {
                    e.printStackTrace();
                    return "";
                }
            }

            @JavascriptInterface
            public boolean appendFileChunk(String saveId, String base64Chunk) {
                SaveSession s;
                synchronized (saveSessions) {
                    s = saveSessions.get(saveId);
                }
                if (s == null || base64Chunk == null) return false;
                FileOutputStream fos = null;
                try {
                    byte[] bytes = Base64.decode(base64Chunk, Base64.DEFAULT);
                    fos = new FileOutputStream(s.tempFile, true);
                    fos.write(bytes);
                    fos.flush();
                    return true;
                } catch (Exception e) {
                    e.printStackTrace();
                    return false;
                } finally {
                    if (fos != null) try { fos.close(); } catch (Exception ignored) {}
                }
            }

            @JavascriptInterface
            public void finishFileSave(String saveId) {
                SaveSession s;
                synchronized (saveSessions) {
                    s = saveSessions.remove(saveId);
                }
                if (s == null || !s.tempFile.exists()) return;
                saveTempFileToDownloads(s.tempFile, s.filename, s.mimeType);
            }

            @JavascriptInterface
            public void downloadBase64(String base64Data, String filename, String mimeType) {
                FileOutputStream fos = null;
                try {
                    byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                    File temp = new File(getCacheDir(), "dl_" + UUID.randomUUID().toString());
                    fos = new FileOutputStream(temp);
                    fos.write(bytes);
                    fos.flush();
                    fos.close();
                    fos = null;
                    saveTempFileToDownloads(temp, sanitizeFilename(filename), mimeType);
                } catch (Exception e) {
                    e.printStackTrace();
                    showToast("Download failed: " + e.getMessage());
                } finally {
                    if (fos != null) try { fos.close(); } catch (Exception ignored) {}
                }
            }
        }, "AndroidBridge");

        webView.loadUrl("https://infinity.local/index.html");
        setContentView(webView);
    }

    private String sanitizeFilename(String name) {
        if (name == null || name.trim().isEmpty()) return "infinity_file";
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private void showToast(final String msg) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show();
            }
        });
    }

    private void copyStream(InputStream in, OutputStream out) throws Exception {
        byte[] buf = new byte[65536];
        int len;
        while ((len = in.read(buf)) > 0) {
            out.write(buf, 0, len);
        }
        out.flush();
    }

    private void saveTempFileToDownloads(File tempFile, String filename, String mimeType) {
        String safeMime = (mimeType != null && !mimeType.isEmpty()) ? mimeType : "application/octet-stream";

        // 1. Android 10+ (API 29+): MediaStore Downloads (Scoped Storage compliant, zero permissions needed)
        if (Build.VERSION.SDK_INT >= 29) {
            OutputStream out = null;
            InputStream in = null;
            try {
                ContentValues values = new ContentValues();
                values.put("_display_name", filename);
                values.put("mime_type", safeMime);
                values.put("relative_path", Environment.DIRECTORY_DOWNLOADS);
                Uri uri = getContentResolver().insert(Uri.parse("content://media/external/downloads"), values);
                if (uri != null) {
                    out = getContentResolver().openOutputStream(uri);
                    if (out != null) {
                        in = new FileInputStream(tempFile);
                        copyStream(in, out);
                        tempFile.delete();
                        showToast("Saved to Downloads: " + filename);
                        return;
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                if (in != null) try { in.close(); } catch (Exception ignored) {}
                if (out != null) try { out.close(); } catch (Exception ignored) {}
            }
        }

        // 2. Android 5-9 (API < 29): Legacy public Downloads folder
        if (Build.VERSION.SDK_INT < 29) {
            OutputStream out = null;
            InputStream in = null;
            try {
                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists()) dir.mkdirs();
                File dest = new File(dir, filename);
                in = new FileInputStream(tempFile);
                out = new FileOutputStream(dest);
                copyStream(in, out);
                MediaScannerConnection.scanFile(this, new String[]{dest.getAbsolutePath()}, new String[]{safeMime}, null);
                tempFile.delete();
                showToast("Saved to Downloads: " + filename);
                return;
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                if (in != null) try { in.close(); } catch (Exception ignored) {}
                if (out != null) try { out.close(); } catch (Exception ignored) {}
            }
        }

        // 3. Ultimate Fallback: System "Save As" document picker (works on ALL Android versions)
        try {
            pendingExportTempFile = tempFile;
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(safeMime);
            intent.putExtra(Intent.EXTRA_TITLE, filename);
            startActivityForResult(intent, CREATE_DOCUMENT_REQUEST_CODE);
        } catch (Exception e) {
            e.printStackTrace();
            showToast("Could not save file: " + e.getMessage());
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (mFilePathCallback != null) {
                Uri[] results = null;
                if (resultCode == Activity.RESULT_OK && data != null) {
                    ClipData clipData = data.getClipData();
                    if (clipData != null) {
                        int count = clipData.getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = clipData.getItemAt(i).getUri();
                        }
                    } else if (data.getData() != null) {
                        results = new Uri[]{data.getData()};
                    }
                }
                mFilePathCallback.onReceiveValue(results);
                mFilePathCallback = null;
            }
            return;
        } else if (requestCode == CREATE_DOCUMENT_REQUEST_CODE) {
            if (pendingExportTempFile != null) {
                if (resultCode == Activity.RESULT_OK && data != null && data.getData() != null) {
                    InputStream in = null;
                    OutputStream out = null;
                    try {
                        in = new FileInputStream(pendingExportTempFile);
                        out = getContentResolver().openOutputStream(data.getData());
                        if (out != null) {
                            copyStream(in, out);
                            showToast("File saved successfully!");
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                        showToast("Save failed: " + e.getMessage());
                    } finally {
                        if (in != null) try { in.close(); } catch (Exception ignored) {}
                        if (out != null) try { out.close(); } catch (Exception ignored) {}
                    }
                }
                pendingExportTempFile.delete();
                pendingExportTempFile = null;
            }
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
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

# Ensure debug.keystore exists
if [ ! -f "$TEST_DIR/debug.keystore" ]; then
    keytool -genkey -v -keystore "$TEST_DIR/debug.keystore" \
        -storepass android -alias androiddebugkey -keypass android \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -dname "CN=Android Debug,O=Android,C=US"
fi

# Sign APK - Produce ONLY ONE single test version APK
apksigner sign \
    --ks "$TEST_DIR/debug.keystore" \
    --ks-pass pass:android \
    --ks-key-alias androiddebugkey \
    --out "$TEST_DIR/infinity-converter.apk" \
    "$BUILD_DIR/aligned.apk"

# Clean any legacy version-numbered apks so ONLY ONE exists in /test
rm -f "$TEST_DIR"/InfinityConverter-*.apk

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
