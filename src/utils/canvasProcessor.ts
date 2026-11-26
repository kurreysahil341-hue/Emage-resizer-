import { OutputFormat, ProcessedOutput, ResizeSettings } from '../types/resizer';

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas encoding returned null blob'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

function drawTransformedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
  settings: ResizeSettings
) {
  const { fitMode, rotation, zoom, panX, panY, backgroundColor, addNameDate, stampName, stampDate } =
    settings;

  ctx.save();
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, targetW, targetH);

  const stripHeight = addNameDate ? Math.max(40, Math.round(targetH * 0.16)) : 0;
  const drawAreaH = Math.max(20, targetH - stripHeight);
  const drawAreaW = targetW;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, drawAreaW, drawAreaH);
  ctx.clip();

  const isQuarterTurn = rotation === 90 || rotation === 270;
  const srcW = isQuarterTurn ? img.naturalHeight : img.naturalWidth;
  const srcH = isQuarterTurn ? img.naturalWidth : img.naturalHeight;

  let renderW = drawAreaW;
  let renderH = drawAreaH;

  if (fitMode === 'cover') {
    const scale = Math.max(drawAreaW / srcW, drawAreaH / srcH) * zoom;
    renderW = srcW * scale;
    renderH = srcH * scale;
  } else if (fitMode === 'contain') {
    const scale = Math.min(drawAreaW / srcW, drawAreaH / srcH) * zoom;
    renderW = srcW * scale;
    renderH = srcH * scale;
  } else {
    renderW = drawAreaW * zoom;
    renderH = drawAreaH * zoom;
  }

  const maxOffsetX = Math.max(0, (renderW - drawAreaW) / 2);
  const maxOffsetY = Math.max(0, (renderH - drawAreaH) / 2);
  const cx =
    drawAreaW / 2 + panX * (fitMode === 'cover' ? maxOffsetX || drawAreaW * 0.15 : drawAreaW * 0.25);
  const cy =
    drawAreaH / 2 + panY * (fitMode === 'cover' ? maxOffsetY || drawAreaH * 0.15 : drawAreaH * 0.25);

  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);

  const drawImgW = isQuarterTurn ? renderH : renderW;
  const drawImgH = isQuarterTurn ? renderW : renderH;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, -drawImgW / 2, -drawImgH / 2, drawImgW, drawImgH);
  ctx.restore();

  if (settings.signatureBoost) {
    const imgData = ctx.getImageData(0, 0, drawAreaW, drawAreaH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum > 175) {
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
      } else {
        const factor = Math.max(0, (lum - 30) / 145);
        d[i] = Math.round(d[i] * factor * 0.65);
        d[i + 1] = Math.round(d[i + 1] * factor * 0.65);
        d[i + 2] = Math.round(d[i + 2] * factor * 0.65);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  if (addNameDate && stripHeight > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, drawAreaH, targetW, stripHeight);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = Math.max(1, Math.round(targetH * 0.004));
    ctx.beginPath();
    ctx.moveTo(0, drawAreaH);
    ctx.lineTo(targetW, drawAreaH);
    ctx.stroke();

    const nameText = (stampName || 'CANDIDATE NAME').trim().toUpperCase();
    const dateText = (stampDate || 'DOP: 26/11/2026').trim().toUpperCase();

    const fontSize = Math.max(11, Math.min(22, Math.floor(stripHeight * 0.34)));
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", Arial, sans-serif`;
    ctx.fillText(nameText, targetW / 2, drawAreaH + stripHeight * 0.34, targetW - 16);
    ctx.font = `600 ${Math.max(10, fontSize - 1)}px "JetBrains Mono", monospace`;
    ctx.fillText(dateText, targetW / 2, drawAreaH + stripHeight * 0.72, targetW - 16);
  }

  ctx.restore();
}

function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * Downscales massive smartphone camera photos (> 2200px) once on load
 * so repeated zoom/pan/compression ticks never exhaust Android WebView RAM.
 */
export function createWorkingProxyImage(
  img: HTMLImageElement,
  maxEdge = 2200
): Promise<HTMLImageElement> {
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (longest <= maxEdge) {
    return Promise.resolve(img);
  }

  return new Promise((resolve) => {
    const scale = maxEdge / longest;
    const proxyCanvas = document.createElement('canvas');
    proxyCanvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    proxyCanvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = proxyCanvas.getContext('2d');
    if (!ctx) {
      resolve(img);
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, proxyCanvas.width, proxyCanvas.height);

    proxyCanvas.toBlob(
      (blob) => {
        releaseCanvas(proxyCanvas);
        if (!blob) {
          resolve(img);
          return;
        }
        const proxyUrl = URL.createObjectURL(blob);
        const proxyImg = new Image();
        proxyImg.onload = () => {
          URL.revokeObjectURL(proxyUrl);
          resolve(proxyImg);
        };
        proxyImg.onerror = () => {
          URL.revokeObjectURL(proxyUrl);
          resolve(img);
        };
        proxyImg.src = proxyUrl;
      },
      'image/png'
    );
  });
}

/**
 * Adaptive 2-stage KB targeting:
 * Stage 1: Binary search on encoder quality (0.12 .. 0.98) at target dimensions.
 * Stage 2: If still above targetBytes, progressively downscale dimensions while
 *          re-optimizing quality so the final file lands cleanly under targetBytes.
 */
async function compressCanvasToTargetBytes(
  sourceCanvas: HTMLCanvasElement,
  mimeType: 'image/jpeg' | 'image/webp',
  targetBytes: number
): Promise<{
  blob: Blob;
  width: number;
  height: number;
  qualityUsed: number;
  iterations: number;
  downscaledForTarget: boolean;
}> {
  let iterations = 0;

  const searchQualityOnCanvas = async (
    canvas: HTMLCanvasElement,
    minQ: number,
    maxQ: number,
    steps: number
  ) => {
    const maxBlob = await canvasToBlob(canvas, mimeType, maxQ);
    iterations++;
    if (maxBlob.size <= targetBytes) {
      return { blob: maxBlob, quality: maxQ, fits: true };
    }

    let low = minQ;
    let high = maxQ;
    let bestFittingBlob: Blob | null = null;
    let bestFittingQuality = minQ;

    for (let i = 0; i < steps; i++) {
      const mid = (low + high) / 2;
      const candidate = await canvasToBlob(canvas, mimeType, mid);
      iterations++;
      if (candidate.size <= targetBytes) {
        bestFittingBlob = candidate;
        bestFittingQuality = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    if (bestFittingBlob) {
      return { blob: bestFittingBlob, quality: bestFittingQuality, fits: true };
    }

    const fallbackMin = await canvasToBlob(canvas, mimeType, minQ);
    iterations++;
    return {
      blob: fallbackMin,
      quality: minQ,
      fits: fallbackMin.size <= targetBytes,
    };
  };

  // Stage 1: Quality binary search at exact target dimensions
  const stage1 = await searchQualityOnCanvas(sourceCanvas, 0.12, 1.0, 9);
  if (stage1.fits) {
    return {
      blob: stage1.blob,
      width: sourceCanvas.width,
      height: sourceCanvas.height,
      qualityUsed: Math.round(stage1.quality * 100) / 100,
      iterations,
      downscaledForTarget: false,
    };
  }

  // Stage 2: Adaptive dimension scaling + quality refinement when target KB is ultra-small
  let bestBlob = stage1.blob;
  let bestW = sourceCanvas.width;
  let bestH = sourceCanvas.height;
  let bestQ = stage1.quality;

  let scale = Math.max(
    0.35,
    Math.min(0.9, Math.sqrt(targetBytes / Math.max(1, bestBlob.size)) * 0.95)
  );

  for (let attempt = 0; attempt < 4; attempt++) {
    const scaledW = Math.max(16, Math.round(sourceCanvas.width * scale));
    const scaledH = Math.max(16, Math.round(sourceCanvas.height * scale));
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = scaledW;
    scaledCanvas.height = scaledH;
    try {
      const sCtx = scaledCanvas.getContext('2d');
      if (!sCtx) break;

      sCtx.imageSmoothingEnabled = true;
      sCtx.imageSmoothingQuality = 'high';
      sCtx.drawImage(sourceCanvas, 0, 0, scaledW, scaledH);

      const stage2 = await searchQualityOnCanvas(scaledCanvas, 0.15, 0.9, 6);
      bestBlob = stage2.blob;
      bestW = scaledW;
      bestH = scaledH;
      bestQ = stage2.quality;

      if (stage2.fits) {
        break;
      }
      scale = Math.max(0.25, scale * 0.78);
    } finally {
      releaseCanvas(scaledCanvas);
    }
  }

  return {
    blob: bestBlob,
    width: bestW,
    height: bestH,
    qualityUsed: Math.round(bestQ * 100) / 100,
    iterations,
    downscaledForTarget: true,
  };
}

/**
 * Pure client-side single-page PDF 1.4 generator embedding raw JPEG bytes (/DCTDecode).
 * Requires zero external libraries and adds only ~550 bytes of PDF structural overhead.
 */
async function buildSingleImagePdfBlob(
  jpegBlob: Blob,
  imgW: number,
  imgH: number
): Promise<Blob> {
  const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
  const encoder = new TextEncoder();

  // Fit inside standard PDF point bounds while preserving exact aspect ratio
  const maxPagePt = 595.28; // A4 width in points
  const scale = imgW > maxPagePt ? maxPagePt / imgW : 1;
  const pageW = +(imgW * scale).toFixed(2);
  const pageH = +(imgH * scale).toFixed(2);

  const contentStr = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;

  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0]; // object 0 is always free
  let cursor = 0;

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    cursor += bytes.length;
  };
  const pushStr = (text: string) => pushBytes(encoder.encode(text));

  // PDF Header
  pushStr('%PDF-1.4\n');

  // 1: Catalog
  offsets.push(cursor);
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  offsets.push(cursor);
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // 3: Page
  offsets.push(cursor);
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  // 4: Embedded JPEG Image XObject
  offsets.push(cursor);
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushStr('\nendstream\nendobj\n');

  // 5: Page Content Stream
  offsets.push(cursor);
  pushStr(`5 0 obj\n<< /Length ${contentStr.length} >>\nstream\n${contentStr}endstream\nendobj\n`);

  // Cross-reference table
  const xrefOffset = cursor;
  pushStr(`xref\n0 ${offsets.length}\n`);
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i < offsets.length; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }

  pushStr(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const merged = new Uint8Array(cursor);
  let writePos = 0;
  for (const part of chunks) {
    merged.set(part, writePos);
    writePos += part.length;
  }

  return new Blob([merged], { type: 'application/pdf' });
}

export async function processImageWithCanvas(
  img: HTMLImageElement,
  settings: ResizeSettings
): Promise<ProcessedOutput> {
  const start = performance.now();
  const targetW = Math.max(16, Math.min(4000, Math.round(settings.width)));
  const targetH = Math.max(16, Math.min(4000, Math.round(settings.height)));
  const targetBytes = Math.max(1024, Math.round(settings.maxKB * 1024));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not initialize 2D canvas context');
    }

    drawTransformedImage(ctx, img, targetW, targetH, settings);

    // Lossless PNG
    if (settings.format === 'image/png') {
      const blob = await canvasToBlob(canvas, 'image/png');
      const url = URL.createObjectURL(blob);
      return {
        blob,
        objectUrl: url,
        previewObjectUrl: url,
        width: targetW,
        height: targetH,
        sizeBytes: blob.size,
        qualityUsed: 1,
        iterations: 1,
        format: settings.format,
        downscaledForTarget: false,
        processingMs: Math.round(performance.now() - start),
      };
    }

    // PDF Output (wraps KB-optimized JPEG into single-page PDF 1.4)
    if (settings.format === 'application/pdf') {
      const pdfOverheadBytes = 850;
      const jpegBudget = Math.max(1024, targetBytes - pdfOverheadBytes);
      const jpegResult = await compressCanvasToTargetBytes(canvas, 'image/jpeg', jpegBudget);
      const pdfBlob = await buildSingleImagePdfBlob(
        jpegResult.blob,
        jpegResult.width,
        jpegResult.height
      );

      return {
        blob: pdfBlob,
        objectUrl: URL.createObjectURL(pdfBlob),
        previewObjectUrl: URL.createObjectURL(jpegResult.blob),
        width: jpegResult.width,
        height: jpegResult.height,
        sizeBytes: pdfBlob.size,
        qualityUsed: jpegResult.qualityUsed,
        iterations: jpegResult.iterations,
        format: 'application/pdf',
        downscaledForTarget: jpegResult.downscaledForTarget,
        processingMs: Math.round(performance.now() - start),
      };
    }

    // JPEG / WebP Output
    const compressed = await compressCanvasToTargetBytes(canvas, settings.format, targetBytes);
    const url = URL.createObjectURL(compressed.blob);

    return {
      blob: compressed.blob,
      objectUrl: url,
      previewObjectUrl: url,
      width: compressed.width,
      height: compressed.height,
      sizeBytes: compressed.blob.size,
      qualityUsed: compressed.qualityUsed,
      iterations: compressed.iterations,
      format: settings.format,
      downscaledForTarget: compressed.downscaledForTarget,
      processingMs: Math.round(performance.now() - start),
    };
  } finally {
    releaseCanvas(canvas);
  }
}

export function createSamplePortraitFile(): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('No canvas context'));

    const bg = ctx.createLinearGradient(0, 0, 0, 1150);
    bg.addColorStop(0, '#f8fafc');
    bg.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 900, 1150);

    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(140, 1150);
    ctx.quadraticCurveTo(180, 820, 450, 800);
    ctx.quadraticCurveTo(720, 820, 760, 1150);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(355, 815);
    ctx.lineTo(450, 940);
    ctx.lineTo(545, 815);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#d99b72';
    ctx.fillRect(385, 670, 130, 180);

    ctx.fillStyle = '#e5aa82';
    ctx.beginPath();
    ctx.ellipse(450, 490, 175, 225, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(450, 325, 182, 115, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(285, 420, 35, 0, Math.PI * 2);
    ctx.arc(615, 420, 35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(382, 470, 18, 11, 0, 0, Math.PI * 2);
    ctx.ellipse(518, 470, 18, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(345, 432);
    ctx.quadraticCurveTo(382, 418, 418, 432);
    ctx.moveTo(482, 432);
    ctx.quadraticCurveTo(518, 418, 555, 432);
    ctx.stroke();

    ctx.strokeStyle = '#b4744d';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(450, 480);
    ctx.lineTo(442, 550);
    ctx.lineTo(465, 556);
    ctx.stroke();

    ctx.strokeStyle = '#9a4f44';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(405, 610);
    ctx.quadraticCurveTo(450, 628, 495, 610);
    ctx.stroke();

    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Sample generation failed'));
        resolve(new File([blob], 'sample-candidate-photo.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.94
    );
  });
}

export function createSampleSignatureFile(): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('No canvas context'));

    ctx.fillStyle = '#ebeef2';
    ctx.fillRect(0, 0, 900, 360);

    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(140, 240);
    ctx.bezierCurveTo(175, 95, 260, 75, 245, 225);
    ctx.bezierCurveTo(235, 165, 310, 145, 325, 215);
    ctx.bezierCurveTo(350, 150, 405, 155, 410, 215);
    ctx.bezierCurveTo(435, 140, 475, 110, 495, 215);
    ctx.bezierCurveTo(525, 155, 575, 175, 605, 210);
    ctx.bezierCurveTo(645, 155, 710, 175, 760, 195);
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(135, 265);
    ctx.quadraticCurveTo(450, 240, 755, 260);
    ctx.stroke();

    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Sample generation failed'));
        resolve(new File([blob], 'sample-signature.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92
    );
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function getExtensionFromFormat(format: OutputFormat): string {
  if (format === 'image/png') return 'png';
  if (format === 'image/webp') return 'webp';
  if (format === 'application/pdf') return 'pdf';
  return 'jpg';
}
