/**
 * Universal download helper that handles:
 * 1. Native Android APK via AndroidBridge (saves directly to Downloads folder)
 * 2. Modern Web browsers via HTML5 a[download] and Blob URL
 * 3. Fallback direct HTTP download
 */

export function downloadMedia(blob: Blob, filename: string, serverDownloadUrl?: string): void {
  // 1. Android APK native bridge
  if (typeof (window as any).AndroidBridge?.downloadBase64 === 'function') {
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        if (res && res.includes(',')) {
          const base64 = res.split(',')[1];
          (window as any).AndroidBridge.downloadBase64(base64, filename, blob.type || 'application/octet-stream');
        }
      };
      reader.readAsDataURL(blob);
      return;
    } catch (e) {
      console.error('AndroidBridge download failed:', e);
    }
  }

  // 2. Web browser blob download
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        // ignore
      }
    }, 2000);
    return;
  } catch (err) {
    console.error('Browser blob download failed:', err);
  }

  // 3. Fallback to server download URL if available
  if (serverDownloadUrl) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = serverDownloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch (err) {
        // ignore
      }
    }, 2000);
  }
}
