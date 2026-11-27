import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  RotateCcw,
  RotateCw,
  Scan,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { Language } from '../types/resizer';

type AspectMode = 'free' | 'preset' | 'passport' | 'square' | 'doc';
type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

interface NormRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface AdvancedCropModalProps {
  isOpen: boolean;
  sourceImg: HTMLImageElement | null;
  presetWidth: number;
  presetHeight: number;
  lang: Language;
  onCancel: () => void;
  onApply: (croppedImg: HTMLImageElement) => void;
}

const MIN_CROP_SIZE = 0.08;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getRotatedDimensions(w: number, h: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    rotW: Math.max(1, Math.round(w * cos + h * sin)),
    rotH: Math.max(1, Math.round(w * sin + h * cos)),
  };
}

function buildCenteredAspectRect(
  rotW: number,
  rotH: number,
  pixelAspect: number
): NormRect {
  const normRatio = pixelAspect * (rotH / Math.max(1, rotW));
  let w = 0.86;
  let h = w / normRatio;
  if (h > 0.86) {
    h = 0.86;
    w = h * normRatio;
  }
  return {
    x: (1 - w) / 2,
    y: (1 - h) / 2,
    w,
    h,
  };
}

export default function AdvancedCropModal({
  isOpen,
  sourceImg,
  presetWidth,
  presetHeight,
  lang,
  onCancel,
  onApply,
}: AdvancedCropModalProps) {
  const [quarterTurns, setQuarterTurns] = useState(0);
  const [straighten, setStraighten] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspectMode, setAspectMode] = useState<AspectMode>('free');
  const [showFaceGuide, setShowFaceGuide] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [crop, setCrop] = useState<NormRect>({ x: 0.07, y: 0.07, w: 0.86, h: 0.86 });

  const stageRef = useRef<HTMLDivElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    handle: DragHandle;
    startClientX: number;
    startClientY: number;
    startRect: NormRect;
    stageW: number;
    stageH: number;
  }>({
    active: false,
    handle: 'move',
    startClientX: 0,
    startClientY: 0,
    startRect: { x: 0.07, y: 0.07, w: 0.86, h: 0.86 },
    stageW: 1,
    stageH: 1,
  });

  const totalDeg = quarterTurns + straighten;

  const rotDims = useMemo(() => {
    if (!sourceImg) return { rotW: 100, rotH: 100 };
    return getRotatedDimensions(sourceImg.naturalWidth, sourceImg.naturalHeight, totalDeg);
  }, [sourceImg, totalDeg]);

  const targetPixelAspect = useMemo<number | null>(() => {
    if (aspectMode === 'free') return null;
    if (aspectMode === 'preset') return presetWidth / Math.max(1, presetHeight);
    if (aspectMode === 'passport') return 3.5 / 4.5;
    if (aspectMode === 'square') return 1;
    return 4 / 3;
  }, [aspectMode, presetWidth, presetHeight]);

  // Reset modal controls whenever opened for a fresh session
  useEffect(() => {
    if (!isOpen || !sourceImg) return;
    setQuarterTurns(0);
    setStraighten(0);
    setFlipH(false);
    setFlipV(false);
    setAspectMode('free');
    setShowFaceGuide(false);
    setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
  }, [isOpen, sourceImg]);

  // Draw live rotated & flipped source onto preview canvas
  useEffect(() => {
    if (!isOpen || !sourceImg || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const maxPreviewEdge = 960;
    const scale = Math.min(1, maxPreviewEdge / Math.max(rotDims.rotW, rotDims.rotH));
    const drawW = Math.max(1, Math.round(rotDims.rotW * scale));
    const drawH = Math.max(1, Math.round(rotDims.rotH * scale));

    canvas.width = drawW;
    canvas.height = drawH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, drawW, drawH);

    ctx.save();
    ctx.translate(drawW / 2, drawH / 2);
    ctx.rotate((totalDeg * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const imgW = sourceImg.naturalWidth * scale;
    const imgH = sourceImg.naturalHeight * scale;
    ctx.drawImage(sourceImg, -imgW / 2, -imgH / 2, imgW, imgH);
    ctx.restore();
  }, [isOpen, sourceImg, rotDims.rotW, rotDims.rotH, totalDeg, flipH, flipV]);

  const handleAspectChange = useCallback(
    (nextMode: AspectMode) => {
      setAspectMode(nextMode);
      if (nextMode === 'free') return;
      const aspect =
        nextMode === 'preset'
          ? presetWidth / Math.max(1, presetHeight)
          : nextMode === 'passport'
          ? 3.5 / 4.5
          : nextMode === 'square'
          ? 1
          : 4 / 3;
      setCrop(buildCenteredAspectRect(rotDims.rotW, rotDims.rotH, aspect));
    },
    [presetWidth, presetHeight, rotDims.rotW, rotDims.rotH]
  );

  // Re-fit locked crop aspect cleanly if image dimensions rotate
  useEffect(() => {
    if (targetPixelAspect === null) return;
    setCrop((prev) => {
      const normRatio = targetPixelAspect * (rotDims.rotH / Math.max(1, rotDims.rotW));
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      let w = prev.w;
      let h = w / normRatio;
      if (h > 0.94) {
        h = 0.94;
        w = h * normRatio;
      }
      if (w > 0.94) {
        w = 0.94;
        h = w / normRatio;
      }
      const x = clamp(cx - w / 2, 0, 1 - w);
      const y = clamp(cy - h / 2, 0, 1 - h);
      return { x, y, w, h };
    });
  }, [targetPixelAspect, rotDims.rotW, rotDims.rotH]);

  const handleAutoTrim = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    // Sample pixels every 2px for instant ink/subject detection
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (lum < 228) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX <= minX || maxY <= minY) return;

    const padX = Math.max(8, Math.round((maxX - minX) * 0.08));
    const padY = Math.max(8, Math.round((maxY - minY) * 0.08));
    const x0 = clamp((minX - padX) / width, 0, 0.9);
    const y0 = clamp((minY - padY) / height, 0, 0.9);
    const x1 = clamp((maxX + padX) / width, x0 + MIN_CROP_SIZE, 1);
    const y1 = clamp((maxY + padY) / height, y0 + MIN_CROP_SIZE, 1);

    setAspectMode('free');
    setCrop({
      x: x0,
      y: y0,
      w: Math.max(MIN_CROP_SIZE, x1 - x0),
      h: Math.max(MIN_CROP_SIZE, y1 - y0),
    });
  };

  const startDrag = (handle: DragHandle, e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRect: crop,
      stageW: rect.width,
      stageH: rect.height,
    };
  };

  const moveDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current.active) return;
    const { handle, startClientX, startClientY, startRect, stageW, stageH } = dragRef.current;
    const dx = (e.clientX - startClientX) / stageW;
    const dy = (e.clientY - startClientY) / stageH;

    if (handle === 'move') {
      setCrop({
        x: clamp(startRect.x + dx, 0, 1 - startRect.w),
        y: clamp(startRect.y + dy, 0, 1 - startRect.h),
        w: startRect.w,
        h: startRect.h,
      });
      return;
    }

    const normRatio =
      targetPixelAspect !== null
        ? targetPixelAspect * (rotDims.rotH / Math.max(1, rotDims.rotW))
        : null;

    if (normRatio === null) {
      let left = startRect.x;
      let top = startRect.y;
      let right = startRect.x + startRect.w;
      let bottom = startRect.y + startRect.h;

      if (handle.includes('w')) left = clamp(startRect.x + dx, 0, right - MIN_CROP_SIZE);
      if (handle.includes('e')) right = clamp(startRect.x + startRect.w + dx, left + MIN_CROP_SIZE, 1);
      if (handle.includes('n')) top = clamp(startRect.y + dy, 0, bottom - MIN_CROP_SIZE);
      if (handle.includes('s')) bottom = clamp(startRect.y + startRect.h + dy, top + MIN_CROP_SIZE, 1);

      setCrop({
        x: left,
        y: top,
        w: right - left,
        h: bottom - top,
      });
      return;
    }

    // Aspect-locked resize
    let nextW = startRect.w;
    let nextH = startRect.h;
    let nextX = startRect.x;
    let nextY = startRect.y;

    if (handle === 'se' || handle === 'ne' || handle === 'sw' || handle === 'nw') {
      const anchorX = handle.includes('w') ? startRect.x + startRect.w : startRect.x;
      const anchorY = handle.includes('n') ? startRect.y + startRect.h : startRect.y;

      const rawW = handle.includes('w') ? startRect.w - dx : startRect.w + dx;
      const rawH = handle.includes('n') ? startRect.h - dy : startRect.h + dy;

      const useWidthDriver = Math.abs(dx) >= Math.abs(dy);
      nextW = useWidthDriver ? rawW : rawH * normRatio;
      nextW = Math.max(MIN_CROP_SIZE, nextW);
      nextH = nextW / normRatio;

      if (nextH < MIN_CROP_SIZE) {
        nextH = MIN_CROP_SIZE;
        nextW = nextH * normRatio;
      }

      const maxAvailW = handle.includes('w') ? anchorX : 1 - anchorX;
      const maxAvailH = handle.includes('n') ? anchorY : 1 - anchorY;

      if (nextW > maxAvailW) {
        nextW = maxAvailW;
        nextH = nextW / normRatio;
      }
      if (nextH > maxAvailH) {
        nextH = maxAvailH;
        nextW = nextH * normRatio;
      }

      nextX = handle.includes('w') ? anchorX - nextW : anchorX;
      nextY = handle.includes('n') ? anchorY - nextH : anchorY;
    } else {
      // Edge handles expand/contract symmetrically around center when aspect-locked
      const cx = startRect.x + startRect.w / 2;
      const cy = startRect.y + startRect.h / 2;

      if (handle === 'e' || handle === 'w') {
        const deltaW = handle === 'e' ? dx : -dx;
        nextW = Math.max(MIN_CROP_SIZE, startRect.w + deltaW * 2);
        nextH = nextW / normRatio;
      } else {
        const deltaH = handle === 's' ? dy : -dy;
        nextH = Math.max(MIN_CROP_SIZE, startRect.h + deltaH * 2);
        nextW = nextH * normRatio;
      }

      const maxHalfW = Math.min(cx, 1 - cx);
      const maxHalfH = Math.min(cy, 1 - cy);
      if (nextW / 2 > maxHalfW) {
        nextW = maxHalfW * 2;
        nextH = nextW / normRatio;
      }
      if (nextH / 2 > maxHalfH) {
        nextH = maxHalfH * 2;
        nextW = nextH * normRatio;
      }
      nextX = cx - nextW / 2;
      nextY = cy - nextH / 2;
    }

    setCrop({
      x: clamp(nextX, 0, 1 - MIN_CROP_SIZE),
      y: clamp(nextY, 0, 1 - MIN_CROP_SIZE),
      w: clamp(nextW, MIN_CROP_SIZE, 1),
      h: clamp(nextH, MIN_CROP_SIZE, 1),
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if already released
    }
  };

  const handleApplyCrop = async () => {
    if (!sourceImg || isApplying) return;
    setIsApplying(true);

    try {
      const fullRotCanvas = document.createElement('canvas');
      fullRotCanvas.width = rotDims.rotW;
      fullRotCanvas.height = rotDims.rotH;
      const rCtx = fullRotCanvas.getContext('2d');
      if (!rCtx) throw new Error('Canvas failed');

      rCtx.fillStyle = '#ffffff';
      rCtx.fillRect(0, 0, rotDims.rotW, rotDims.rotH);
      rCtx.save();
      rCtx.translate(rotDims.rotW / 2, rotDims.rotH / 2);
      rCtx.rotate((totalDeg * Math.PI) / 180);
      rCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      rCtx.imageSmoothingEnabled = true;
      rCtx.imageSmoothingQuality = 'high';
      rCtx.drawImage(
        sourceImg,
        -sourceImg.naturalWidth / 2,
        -sourceImg.naturalHeight / 2,
        sourceImg.naturalWidth,
        sourceImg.naturalHeight
      );
      rCtx.restore();

      const sx = Math.max(0, Math.round(crop.x * rotDims.rotW));
      const sy = Math.max(0, Math.round(crop.y * rotDims.rotH));
      const sw = Math.max(16, Math.min(rotDims.rotW - sx, Math.round(crop.w * rotDims.rotW)));
      const sh = Math.max(16, Math.min(rotDims.rotH - sy, Math.round(crop.h * rotDims.rotH)));

      const outCanvas = document.createElement('canvas');
      outCanvas.width = sw;
      outCanvas.height = sh;
      const oCtx = outCanvas.getContext('2d');
      if (!oCtx) {
        fullRotCanvas.width = 0;
        fullRotCanvas.height = 0;
        throw new Error('Output canvas failed');
      }

      oCtx.drawImage(fullRotCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
      fullRotCanvas.width = 0;
      fullRotCanvas.height = 0;

      const blob = await new Promise<Blob | null>((resolve) =>
        outCanvas.toBlob((b) => resolve(b), 'image/png')
      );
      outCanvas.width = 0;
      outCanvas.height = 0;

      if (!blob) throw new Error('Crop export failed');

      const blobUrl = URL.createObjectURL(blob);
      const croppedImg = new Image();
      croppedImg.onload = () => {
        URL.revokeObjectURL(blobUrl);
        setIsApplying(false);
        onApply(croppedImg);
      };
      croppedImg.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        setIsApplying(false);
      };
      croppedImg.src = blobUrl;
    } catch {
      setIsApplying(false);
    }
  };

  if (!isOpen || !sourceImg) return null;

  const cropPxW = Math.max(1, Math.round(crop.w * rotDims.rotW));
  const cropPxH = Math.max(1, Math.round(crop.h * rotDims.rotH));

  const copy =
    lang === 'hi'
      ? {
          title: 'एडवांस इमेज क्रॉप और सीधा करें',
          autoTrim: 'ऑटो क्रॉप (मार्जिन हटाएँ)',
          faceGuide: 'पासपोर्ट चेहरा गाइड',
          free: 'फ्री क्रॉप',
          preset: `प्रीसेट (${presetWidth}×${presetHeight})`,
          passport: '3.5 : 4.5',
          square: '1 : 1',
          doc: '4 : 3',
          straighten: 'कोण सीधा करें (Straighten)',
          resetAll: 'रीसेट',
          cancel: 'रद्द करें',
          apply: 'क्रॉप लागू करें',
          applying: 'प्रोसेस हो रहा है...',
        }
      : {
          title: 'Advanced Crop & Straighten',
          autoTrim: 'Auto-Trim Margins',
          faceGuide: 'Passport Face Guide',
          free: 'Free Crop',
          preset: `Preset (${presetWidth}×${presetHeight})`,
          passport: '3.5 : 4.5',
          square: '1 : 1',
          doc: '4 : 3',
          straighten: 'Straighten Angle',
          resetAll: 'Reset',
          cancel: 'Cancel',
          apply: 'Apply Crop',
          applying: 'Applying...',
        };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      <div className="w-full max-w-3xl max-h-[95dvh] bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Crop className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <h2
              id="crop-modal-title"
              className="font-display text-sm sm:text-base font-semibold text-slate-900 truncate"
            >
              {copy.title}
            </h2>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono tabular-nums text-slate-600">
              {cropPxW} × {cropPxH} px
            </span>
            <button
              type="button"
              onClick={onCancel}
              aria-label={copy.cancel}
              className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Interactive Crop Canvas Stage */}
        <div className="flex-1 min-h-[240px] bg-slate-900 p-3 sm:p-5 flex items-center justify-center overflow-hidden">
          <div
            ref={stageRef}
            className="relative max-w-full max-h-full select-none overflow-hidden"
            style={{
              aspectRatio: `${rotDims.rotW} / ${rotDims.rotH}`,
              maxHeight: '50dvh',
              touchAction: 'none',
            }}
          >
            <canvas
              ref={previewCanvasRef}
              className="w-full h-full block"
            />

            {/* Dimmed Backdrop via 4 surrounding strips so center remains crisp */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 bg-slate-950/60"
              style={{ height: `${crop.y * 100}%` }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-950/60"
              style={{ height: `${Math.max(0, 1 - crop.y - crop.h) * 100}%` }}
            />
            <div
              className="pointer-events-none absolute left-0 bg-slate-950/60"
              style={{
                top: `${crop.y * 100}%`,
                height: `${crop.h * 100}%`,
                width: `${crop.x * 100}%`,
              }}
            />
            <div
              className="pointer-events-none absolute right-0 bg-slate-950/60"
              style={{
                top: `${crop.y * 100}%`,
                height: `${crop.h * 100}%`,
                width: `${Math.max(0, 1 - crop.x - crop.w) * 100}%`,
              }}
            />

            {/* Interactive Crop Box */}
            <div
              onPointerDown={(e) => startDrag('move', e)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className="absolute border-2 border-white cursor-move"
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.w * 100}%`,
                height: `${crop.h * 100}%`,
                touchAction: 'none',
              }}
            >
              {/* Rule of Thirds Grid */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
              </div>

              {/* Optional Passport Face & Eye Alignment Guide */}
              {showFaceGuide && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-[62%] h-[68%] -mt-[8%] border border-dashed border-sky-300/90 rounded-full" />
                </div>
              )}

              {/* 4 Corner Handles (large touch hit targets) */}
              <button
                type="button"
                aria-label="Resize top-left"
                onPointerDown={(e) => startDrag('nw', e)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="absolute -left-3 -top-3 w-7 h-7 flex items-center justify-center cursor-nwse-resize"
                style={{ touchAction: 'none' }}
              >
                <span className="w-3.5 h-3.5 bg-blue-600 border-2 border-white block" />
              </button>
              <button
                type="button"
                aria-label="Resize top-right"
                onPointerDown={(e) => startDrag('ne', e)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="absolute -right-3 -top-3 w-7 h-7 flex items-center justify-center cursor-nesw-resize"
                style={{ touchAction: 'none' }}
              >
                <span className="w-3.5 h-3.5 bg-blue-600 border-2 border-white block" />
              </button>
              <button
                type="button"
                aria-label="Resize bottom-left"
                onPointerDown={(e) => startDrag('sw', e)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="absolute -left-3 -bottom-3 w-7 h-7 flex items-center justify-center cursor-nesw-resize"
                style={{ touchAction: 'none' }}
              >
                <span className="w-3.5 h-3.5 bg-blue-600 border-2 border-white block" />
              </button>
              <button
                type="button"
                aria-label="Resize bottom-right"
                onPointerDown={(e) => startDrag('se', e)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="absolute -right-3 -bottom-3 w-7 h-7 flex items-center justify-center cursor-nwse-resize"
                style={{ touchAction: 'none' }}
              >
                <span className="w-3.5 h-3.5 bg-blue-600 border-2 border-white block" />
              </button>

              {/* 4 Edge Midpoint Handles */}
              <button
                type="button"
                aria-label="Resize top edge"
                onPointerDown={(e) => startDrag('n', e)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="absolute left-1/2 -translate-x-1/2 -top-3 w-8 h-6 flex items-center justify-center cursor-ns-resize"
                style={{ touchAction: 'none' }}
              >
                <span className="w-5 h-1.5 bg-white border border-slate-700 block" />
              </button>
              <button
                type="button"
                aria-label="Resize bottom edge"
                onPointerDown={(e) => startDrag('s', e)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-8 h-6 flex items-center justify-center cursor-ns-resize"
                style={{ touchAction: 'none' }}
              >
                <span className="w-5 h-1.5 bg-white border border-slate-700 block" />
              </button>
              <button
                type="button"
                aria-label="Resize left edge"
                onPointerDown={(e) => startDrag('w', e)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-8 flex items-center justify-center cursor-ew-resize"
                style={{ touchAction: 'none' }}
              >
                <span className="w-1.5 h-5 bg-white border border-slate-700 block" />
              </button>
              <button
                type="button"
                aria-label="Resize right edge"
                onPointerDown={(e) => startDrag('e', e)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-8 flex items-center justify-center cursor-ew-resize"
                style={{ touchAction: 'none' }}
              >
                <span className="w-1.5 h-5 bg-white border border-slate-700 block" />
              </button>
            </div>
          </div>
        </div>

        {/* Crop Toolbar & Controls */}
        <div className="p-4 border-t border-slate-200 bg-white space-y-3 shrink-0 overflow-y-auto">
          {/* Aspect Ratio Presets */}
          <div className="grid grid-cols-5 gap-1.5">
            {(
              [
                { id: 'free', label: copy.free },
                { id: 'preset', label: copy.preset },
                { id: 'passport', label: copy.passport },
                { id: 'square', label: copy.square },
                { id: 'doc', label: copy.doc },
              ] as { id: AspectMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleAspectChange(opt.id)}
                className={`min-h-[38px] px-2 py-1 text-[11px] sm:text-xs font-medium rounded-md border truncate cursor-pointer transition-colors ${
                  aspectMode === opt.id
                    ? 'bg-blue-50 border-blue-600 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Straighten Angle Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-600">{copy.straighten}</span>
              <span className="font-mono tabular-nums text-slate-800">
                {straighten > 0 ? `+${straighten}°` : `${straighten}°`}
              </span>
            </div>
            <input
              type="range"
              aria-label={copy.straighten}
              min={-45}
              max={45}
              step={1}
              value={straighten}
              onChange={(e) => setStraighten(Number(e.target.value))}
              className="w-full accent-blue-700 cursor-pointer"
            />
          </div>

          {/* Quick Transform & Helper Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setQuarterTurns((q) => (q + 270) % 360)}
              aria-label="Rotate 90 left"
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>90°</span>
            </button>
            <button
              type="button"
              onClick={() => setQuarterTurns((q) => (q + 90) % 360)}
              aria-label="Rotate 90 right"
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>90°</span>
            </button>
            <button
              type="button"
              onClick={() => setFlipH((v) => !v)}
              aria-label="Flip horizontally"
              className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                flipH
                  ? 'bg-blue-50 border-blue-600 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FlipHorizontal2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setFlipV((v) => !v)}
              aria-label="Flip vertically"
              className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                flipV
                  ? 'bg-blue-50 border-blue-600 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FlipVertical2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleAutoTrim}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
              <span>{copy.autoTrim}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowFaceGuide((v) => !v)}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                showFaceGuide
                  ? 'bg-blue-50 border-blue-600 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{copy.faceGuide}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setQuarterTurns(0);
                setStraighten(0);
                setFlipH(false);
                setFlipV(false);
                setAspectMode('free');
                setCrop({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 });
              }}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Scan className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{copy.resetAll}</span>
            </button>
          </div>

          {/* Footer Action Row */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 cursor-pointer"
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              disabled={isApplying}
              onClick={handleApplyCrop}
              className="min-h-[44px] px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>{isApplying ? copy.applying : copy.apply}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
