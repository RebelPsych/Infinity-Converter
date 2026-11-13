/**
 * Universal download and runtime helper for Web browsers and the Android APK.
 */

export function isAndroidApk(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname === 'infinity.local' ||
    Boolean((window as any).AndroidBridge)
  );
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, slice as unknown as number[]);
  }
  return btoa(binary);
}

export async function saveToAndroidBridge(blob: Blob, filename: string): Promise<boolean> {
  const bridge = (window as any).AndroidBridge;
  if (!bridge) return false;

  const mime = blob.type || 'application/octet-stream';

  // Prefer chunked streaming bridge for arbitrary file sizes
  if (
    typeof bridge.startFileSave === 'function' &&
    typeof bridge.appendFileChunk === 'function' &&
    typeof bridge.finishFileSave === 'function'
  ) {
    const saveId: string = bridge.startFileSave(filename, mime);
    if (!saveId) return false;

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Chunk size multiple of 3 (240KB) so base64 chunks never pad mid-stream
    const chunkBytes = 240 * 1024;

    for (let offset = 0; offset < bytes.length; offset += chunkBytes) {
      const slice = bytes.subarray(offset, Math.min(bytes.length, offset + chunkBytes));
      const b64 = uint8ArrayToBase64(slice);
      bridge.appendFileChunk(saveId, b64);
    }

    bridge.finishFileSave(saveId);
    return true;
  }

  // Legacy single-shot fallback
  if (typeof bridge.downloadBase64 === 'function') {
    const buffer = await blob.arrayBuffer();
    const b64 = uint8ArrayToBase64(new Uint8Array(buffer));
    bridge.downloadBase64(b64, filename, mime);
    return true;
  }

  return false;
}

export function downloadMedia(
  blob: Blob,
  filename: string,
  serverDownloadUrl?: string,
  existingObjectUrl?: string
): void {
  // 1. Android APK native MediaStore / Downloads bridge
  if (typeof (window as any).AndroidBridge !== 'undefined') {
    saveToAndroidBridge(blob, filename).catch((err) => {
      console.error('AndroidBridge save failed:', err);
    });
    return;
  }

  // 2. If server persistent URL is available, trigger direct HTTP attachment download
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
      } catch {
        // ignore
      }
    }, 3000);
    return;
  }

  // 3. Browser Blob URL download
  const url = existingObjectUrl || URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    try {
      document.body.removeChild(a);
      if (!existingObjectUrl) {
        URL.revokeObjectURL(url);
      }
    } catch {
      // ignore
    }
  }, 60000);
}
