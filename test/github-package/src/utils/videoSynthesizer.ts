/**
 * Client-side 16:9 Landscape MP4/WebM video synthesizer using Canvas and MediaRecorder.
 * Used as automatic seamless fallback when server fetch fails or in offline Android APK.
 */

export async function synthesizeLandscapeVideoClient(
  audioFile: File,
  imageFile: File,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  onProgress?.('Preparing image & audio...');

  // 1. Load image
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const imgUrl = URL.createObjectURL(imageFile);
  img.src = imgUrl;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image for video synthesis'));
  });

  // 2. Setup 16:9 Canvas
  const width = 1920;
  const height = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context not available');

  // Draw 16:9 letterbox/pillarbox
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const imgAspect = img.width / img.height;
  const targetAspect = width / height;
  let drawW = width;
  let drawH = height;
  let drawX = 0;
  let drawY = 0;

  if (imgAspect > targetAspect) {
    drawW = width;
    drawH = width / imgAspect;
    drawY = (height - drawH) / 2;
  } else {
    drawH = height;
    drawW = height * imgAspect;
    drawX = (width - drawW) / 2;
  }

  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  onProgress?.('Decoding audio track...');

  // 3. Setup Web Audio
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  onProgress?.('Synthesizing 16:9 video stream...');

  const canvasStream = canvas.captureStream(30);
  const audioDest = audioContext.createMediaStreamDestination();
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioDest);

  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);

  // Pick supported mime type
  let mimeType = 'video/mp4';
  if (!MediaRecorder.isTypeSupported('video/mp4')) {
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    }
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 2500000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      URL.revokeObjectURL(imgUrl);
      const outBlob = new Blob(chunks, { type: 'video/mp4' });
      resolve(outBlob);
    };

    recorder.onerror = (e) => {
      URL.revokeObjectURL(imgUrl);
      reject(e);
    };

    recorder.start(100);
    source.start(0);

    // Keep refreshing canvas so video track produces frames
    const interval = setInterval(() => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }, 100);

    source.onended = () => {
      clearInterval(interval);
      setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, 200);
    };
  });
}
