import express, { Request, Response } from 'express';
import multer from 'multer';
import { exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Setup upload directory
const UPLOAD_DIR = path.join('/tmp', 'infinity-uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer upload config
const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});

app.use(express.json());

// Helper function to safely remove files
function cleanupFiles(filePaths: (string | undefined)[]) {
  for (const fp of filePaths) {
    if (fp && fs.existsSync(fp)) {
      try {
        fs.unlinkSync(fp);
      } catch (err) {
        console.error('Error cleaning up file:', fp, err);
      }
    }
  }
}

// 1. Health check
app.get('/api/health', (_req: Request, res: Response) => {
  exec('ffmpeg -version', (err, stdout) => {
    if (err) {
      return res.status(500).json({ status: 'error', ffmpeg: false, error: err.message });
    }
    const firstLine = stdout.split('\n')[0];
    res.json({
      status: 'ok',
      ffmpeg: true,
      ffmpegVersion: firstLine,
      apkReady: fs.existsSync(path.join(__dirname, 'test', 'infinity-converter.apk')),
    });
  });
});

// 2. Media File Inspector
app.post('/api/inspect', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const filePath = req.file.path;
  const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;

  exec(cmd, (err, stdout) => {
    cleanupFiles([filePath]);
    if (err) {
      return res.status(500).json({ error: 'Failed to inspect media file', details: err.message });
    }

    try {
      const data = JSON.parse(stdout);
      const format = data.format || {};
      const streams = data.streams || [];
      const videoStream = streams.find((s: any) => s.codec_type === 'video');
      const audioStream = streams.find((s: any) => s.codec_type === 'audio');

      res.json({
        duration: parseFloat(format.duration || '0'),
        size: parseInt(format.size || '0', 10),
        bitrate: parseInt(format.bit_rate || '0', 10),
        formatName: format.format_long_name || format.format_name || 'Unknown',
        videoWidth: videoStream ? videoStream.width : undefined,
        videoHeight: videoStream ? videoStream.height : undefined,
        videoCodec: videoStream ? videoStream.codec_name : undefined,
        audioCodec: audioStream ? audioStream.codec_name : undefined,
        audioSampleRate: audioStream ? parseInt(audioStream.sample_rate || '0', 10) : undefined,
        audioChannels: audioStream ? audioStream.channels : undefined,
      });
    } catch (parseError: any) {
      res.status(500).json({ error: 'Failed to parse probe data', details: parseError.message });
    }
  });
});

// 3. MP4 to MP3 Conversion
app.post('/api/convert/mp4-to-mp3', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No media file uploaded' });
  }

  const inputPath = req.file.path;
  const originalName = req.file.originalname || 'audio';
  const baseName = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const outputPath = path.join(UPLOAD_DIR, `${baseName}_${Date.now()}.mp3`);

  const bitrate = req.body.bitrate || '320k';
  const sampleRate = req.body.sampleRate || '44100';
  const channels = req.body.channels || '2';
  const startTime = req.body.startTime ? parseFloat(req.body.startTime) : undefined;
  const endTime = req.body.endTime ? parseFloat(req.body.endTime) : undefined;

  const metadataTitle = req.body.title || baseName;
  const metadataArtist = req.body.artist || '';
  const metadataAlbum = req.body.album || '';
  const metadataYear = req.body.year || '';
  const metadataGenre = req.body.genre || '';

  const args: string[] = ['-y'];

  if (startTime !== undefined && !isNaN(startTime) && startTime > 0) {
    args.push('-ss', startTime.toString());
  }

  args.push('-i', inputPath);

  if (endTime !== undefined && !isNaN(endTime) && endTime > (startTime || 0)) {
    const duration = endTime - (startTime || 0);
    args.push('-t', duration.toString());
  }

  args.push(
    '-vn', // strip video
    '-c:a', 'libmp3lame',
    '-b:a', bitrate,
    '-ar', sampleRate,
    '-ac', channels
  );

  // ID3 metadata
  if (metadataTitle) args.push('-metadata', `title=${metadataTitle}`);
  if (metadataArtist) args.push('-metadata', `artist=${metadataArtist}`);
  if (metadataAlbum) args.push('-metadata', `album=${metadataAlbum}`);
  if (metadataYear) args.push('-metadata', `date=${metadataYear}`);
  if (metadataGenre) args.push('-metadata', `genre=${metadataGenre}`);

  args.push(outputPath);

  console.log(`Executing FFmpeg MP4->MP3: ffmpeg ${args.join(' ')}`);

  const ffmpeg = spawn('ffmpeg', args);
  let stderr = '';

  ffmpeg.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  ffmpeg.on('close', (code) => {
    if (code !== 0) {
      cleanupFiles([inputPath, outputPath]);
      console.error('FFmpeg MP4->MP3 conversion failed:', stderr);
      return res.status(500).json({ error: 'FFmpeg conversion failed', details: stderr });
    }

    if (!fs.existsSync(outputPath)) {
      cleanupFiles([inputPath]);
      return res.status(500).json({ error: 'Output file was not generated' });
    }

    const downloadFileName = `${baseName}.mp3`;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
    res.setHeader('X-Output-Filename', downloadFileName);

    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);

    fileStream.on('close', () => {
      cleanupFiles([inputPath, outputPath]);
    });

    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      cleanupFiles([inputPath, outputPath]);
    });
  });
});

// 4. MP3 to MP4 Conversion (Landscape Formatted Video with Image and Audio)
app.post('/api/convert/mp3-to-mp4', upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'artwork', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]), (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const audioFile = files?.file?.[0];
  const imageFile = files?.image?.[0] || files?.artwork?.[0];

  if (!audioFile) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  const audioPath = audioFile.path;
  const originalName = audioFile.originalname || 'video';
  const baseName = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const outputPath = path.join(UPLOAD_DIR, `${baseName}_landscape_${Date.now()}.mp4`);

  const showWaveform = req.body.showWaveform === 'true';
  const fps = parseInt(req.body.fps || '30', 10);
  const startTime = req.body.startTime ? parseFloat(req.body.startTime) : undefined;
  const endTime = req.body.endTime ? parseFloat(req.body.endTime) : undefined;

  // Fixed 16:9 Landscape dimensions (1920x1080) formatted for view
  const width = 1920;
  const height = 1080;

  const args: string[] = ['-y'];

  if (startTime !== undefined && !isNaN(startTime) && startTime > 0) {
    args.push('-ss', startTime.toString());
  }

  args.push('-i', audioPath);

  if (endTime !== undefined && !isNaN(endTime) && endTime > (startTime || 0)) {
    const duration = endTime - (startTime || 0);
    args.push('-t', duration.toString());
  }

  let filterComplex = '';

  if (imageFile && fs.existsSync(imageFile.path)) {
    // Loop image input
    args.push('-loop', '1', '-i', imageFile.path);

    if (showWaveform) {
      filterComplex = `[1:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black[bg];` +
        `[0:a]showwaves=s=${width}x${Math.round(height * 0.18)}:mode=line:colors=white:r=${fps}[waves];` +
        `[bg][waves]overlay=0:H-h-24[v]`;
    } else {
      filterComplex = `[1:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black[v]`;
    }
  } else {
    // Fallback if no image provided: minimalist landscape infinity generator
    filterComplex = `[0:a]avectorscope=s=${width}x${height}:m=lissajous:draw=line:rc=255:gc=255:bc=255[v]`;
  }

  args.push(
    '-filter_complex', filterComplex,
    '-map', '[v]',
    '-map', '0:a',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '22',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '256k',
    '-shortest',
    '-movflags', '+faststart',
    outputPath
  );

  console.log(`Executing FFmpeg MP3->MP4: ffmpeg ${args.join(' ')}`);

  const ffmpeg = spawn('ffmpeg', args);
  let stderr = '';

  ffmpeg.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  ffmpeg.on('close', (code) => {
    const toClean = [audioPath, outputPath];
    if (imageFile) toClean.push(imageFile.path);

    if (code !== 0) {
      cleanupFiles(toClean);
      console.error('FFmpeg MP3->MP4 failed:', stderr);
      return res.status(500).json({ error: 'FFmpeg video synthesis failed', details: stderr });
    }

    if (!fs.existsSync(outputPath)) {
      cleanupFiles(toClean);
      return res.status(500).json({ error: 'Output video was not generated' });
    }

    const downloadFileName = `${baseName}.mp4`;
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
    res.setHeader('X-Output-Filename', downloadFileName);

    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);

    fileStream.on('close', () => {
      cleanupFiles(toClean);
    });

    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      cleanupFiles(toClean);
    });
  });
});

// 5. Download APK endpoint
app.get('/api/download/apk', (_req: Request, res: Response) => {
  const apkPath = path.join(__dirname, 'test', 'infinity-converter.apk');
  if (!fs.existsSync(apkPath)) {
    return res.status(404).json({ error: 'APK file not found. Please compile it first.' });
  }

  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="infinity-converter.apk"');
  fs.createReadStream(apkPath).pipe(res);
});

// 6. Download GitHub Package endpoint
app.get('/api/download/github-package', (_req: Request, res: Response) => {
  const zipPath = path.join(__dirname, 'test', 'infinity-converter-github.zip');
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: 'GitHub package not found.' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="infinity-converter-github.zip"');
  fs.createReadStream(zipPath).pipe(res);
});

// Dev vs Production Setup
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Infinity Converter server running on port ${PORT} [${isProduction ? 'PROD' : 'DEV'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
