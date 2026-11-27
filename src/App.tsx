import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ImagePlus,
  Lock,
  RotateCcw,
  RotateCw,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Type,
  Unlock,
  Upload,
} from 'lucide-react';
import { COPY, EXAM_PRESETS } from './data/presets';
import {
  ExamCategory,
  FitMode,
  Language,
  OutputFormat,
  ProcessedOutput,
  ResizeSettings,
  SourceImageInfo,
} from './types/resizer';
import {
  createSamplePortraitFile,
  createSampleSignatureFile,
  createWorkingProxyImage,
  formatBytes,
  getExtensionFromFormat,
  processImageWithCanvas,
} from './utils/canvasProcessor';

const INITIAL_PRESET = EXAM_PRESETS[0];

export default function App() {
  const [lang, setLang] = useState<Language>('hi');
  const t = COPY[lang];

  const [activeCategory, setActiveCategory] = useState<ExamCategory>('rrb');
  const [settings, setSettings] = useState<ResizeSettings>({
    presetId: INITIAL_PRESET.id,
    width: INITIAL_PRESET.width,
    height: INITIAL_PRESET.height,
    lockAspect: false,
    fitMode: INITIAL_PRESET.fitMode,
    maxKB: INITIAL_PRESET.defaultMaxKB,
    format: INITIAL_PRESET.format,
    rotation: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    signatureBoost: false,
    addNameDate: false,
    stampName: '',
    stampDate: 'DOP: 26/11/2026',
    backgroundColor: '#ffffff',
  });

  const [sourceInfo, setSourceInfo] = useState<SourceImageInfo | null>(null);
  const [sourceImgEl, setSourceImgEl] = useState<HTMLImageElement | null>(null);
  const [output, setOutput] = useState<ProcessedOutput | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'processed' | 'compare' | 'original'>('processed');
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [kbDraft, setKbDraft] = useState<string>(String(INITIAL_PRESET.defaultMaxKB));
  const [widthDraft, setWidthDraft] = useState<string>(String(INITIAL_PRESET.width));
  const [heightDraft, setHeightDraft] = useState<string>(String(INITIAL_PRESET.height));

  useEffect(() => {
    setKbDraft(String(settings.maxKB));
  }, [settings.maxKB]);

  useEffect(() => {
    setWidthDraft(String(settings.width));
  }, [settings.width]);

  useEffect(() => {
    setHeightDraft(String(settings.height));
  }, [settings.height]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragPanRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    origPanX: 0,
    origPanY: 0,
  });

  const activePreset = useMemo(
    () => EXAM_PRESETS.find((p) => p.id === settings.presetId) || INITIAL_PRESET,
    [settings.presetId]
  );

  const filteredPresets = useMemo(
    () => EXAM_PRESETS.filter((p) => p.category === activeCategory),
    [activeCategory]
  );

  // Cleanup object URLs on unmount or replacement
  const prevSourceUrlRef = useRef<string | null>(null);
  const prevOutputUrlRef = useRef<string | null>(null);
  const prevPreviewUrlRef = useRef<string | null>(null);
  const latestJobIdRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (prevSourceUrlRef.current) URL.revokeObjectURL(prevSourceUrlRef.current);
      if (prevOutputUrlRef.current) URL.revokeObjectURL(prevOutputUrlRef.current);
      if (prevPreviewUrlRef.current && prevPreviewUrlRef.current !== prevOutputUrlRef.current) {
        URL.revokeObjectURL(prevPreviewUrlRef.current);
      }
    };
  }, []);

  const loadImageFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        setErrorMsg(t.errInvalidFile);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setErrorMsg(t.errTooLargeFile);
        return;
      }
      setErrorMsg(null);
      setSaveBanner(null);
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        const workingImg = await createWorkingProxyImage(img, 2200);
        if (prevSourceUrlRef.current) {
          URL.revokeObjectURL(prevSourceUrlRef.current);
        }
        prevSourceUrlRef.current = objectUrl;
        setSourceInfo({
          name: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
          sizeBytes: file.size,
          mimeType: file.type,
          objectUrl,
        });
        setSourceImgEl(workingImg);
        setPreviewTab('processed');
        setSettings((prev) => ({
          ...prev,
          rotation: 0,
          zoom: 1,
          panX: 0,
          panY: 0,
        }));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setErrorMsg(t.errDecodeFailed);
      };
      img.src = objectUrl;
    },
    [t.errDecodeFailed, t.errInvalidFile, t.errTooLargeFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImageFile(file);
    }
    e.target.value = '';
  };

  const handleLoadSample = async (kind: 'photo' | 'signature') => {
    try {
      const file =
        kind === 'photo'
          ? await createSamplePortraitFile()
          : await createSampleSignatureFile();

      if (kind === 'signature') {
        const sigPreset = EXAM_PRESETS.find((p) => p.id === 'rrb-sign') || EXAM_PRESETS[1];
        setActiveCategory('rrb');
        setSettings((prev) => ({
          ...prev,
          presetId: sigPreset.id,
          width: sigPreset.width,
          height: sigPreset.height,
          fitMode: sigPreset.fitMode,
          maxKB: sigPreset.defaultMaxKB,
          format: sigPreset.format,
          signatureBoost: true,
          addNameDate: false,
        }));
      } else {
        const photoPreset = EXAM_PRESETS.find((p) => p.id === 'rrb-photo') || EXAM_PRESETS[0];
        setActiveCategory('rrb');
        setSettings((prev) => ({
          ...prev,
          presetId: photoPreset.id,
          width: photoPreset.width,
          height: photoPreset.height,
          fitMode: photoPreset.fitMode,
          maxKB: photoPreset.defaultMaxKB,
          format: photoPreset.format,
          signatureBoost: false,
        }));
      }
      loadImageFile(file);
    } catch {
      setErrorMsg('Could not generate local sample image.');
    }
  };

  const selectPreset = (presetId: string) => {
    const found = EXAM_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setSettings((prev) => ({
      ...prev,
      presetId: found.id,
      width: found.width,
      height: found.height,
      fitMode: found.fitMode,
      maxKB: found.defaultMaxKB,
      format: found.format,
      signatureBoost: found.kind === 'signature' ? prev.signatureBoost : false,
      addNameDate: found.kind === 'photo' ? prev.addNameDate : false,
      zoom: 1,
      panX: 0,
      panY: 0,
    }));
  };

  const handleCategorySwitch = (cat: ExamCategory) => {
    setActiveCategory(cat);
    const firstInCat = EXAM_PRESETS.find((p) => p.category === cat);
    if (firstInCat) {
      selectPreset(firstInCat.id);
    }
  };

  const handleWidthChange = (nextWidth: number) => {
    const safeW = Number.isFinite(nextWidth) ? Math.max(16, Math.min(4000, nextWidth)) : 16;
    setSettings((prev) => {
      if (!prev.lockAspect || prev.width <= 0) {
        return { ...prev, width: safeW, presetId: 'custom-free' };
      }
      const ratio = prev.height / prev.width;
      return {
        ...prev,
        width: safeW,
        height: Math.max(16, Math.min(4000, Math.round(safeW * ratio))),
        presetId: 'custom-free',
      };
    });
  };

  const handleHeightChange = (nextHeight: number) => {
    const safeH = Number.isFinite(nextHeight) ? Math.max(16, Math.min(4000, nextHeight)) : 16;
    setSettings((prev) => {
      if (!prev.lockAspect || prev.height <= 0) {
        return { ...prev, height: safeH, presetId: 'custom-free' };
      }
      const ratio = prev.width / prev.height;
      return {
        ...prev,
        height: safeH,
        width: Math.max(16, Math.min(4000, Math.round(safeH * ratio))),
        presetId: 'custom-free',
      };
    });
  };

  // Run HTML5 Canvas processing whenever source image or settings change
  useEffect(() => {
    if (!sourceImgEl) return;
    let cancelled = false;
    const jobId = ++latestJobIdRef.current;
    setIsProcessing(true);

    const timer = window.setTimeout(async () => {
      try {
        const result = await processImageWithCanvas(sourceImgEl, settings);
        if (cancelled || jobId !== latestJobIdRef.current) {
          URL.revokeObjectURL(result.objectUrl);
          if (result.previewObjectUrl !== result.objectUrl) {
            URL.revokeObjectURL(result.previewObjectUrl);
          }
          return;
        }
        if (prevOutputUrlRef.current) {
          URL.revokeObjectURL(prevOutputUrlRef.current);
        }
        if (prevPreviewUrlRef.current && prevPreviewUrlRef.current !== prevOutputUrlRef.current) {
          URL.revokeObjectURL(prevPreviewUrlRef.current);
        }
        prevOutputUrlRef.current = result.objectUrl;
        prevPreviewUrlRef.current = result.previewObjectUrl;
        setOutput(result);
        setSaveBanner(null);
        setErrorMsg(null);
      } catch (err) {
        if (!cancelled && jobId === latestJobIdRef.current) {
          setErrorMsg(err instanceof Error ? err.message : 'Canvas processing failed');
        }
      } finally {
        if (!cancelled && jobId === latestJobIdRef.current) {
          setIsProcessing(false);
        }
      }
    }, 95);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sourceImgEl, settings]);

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = () => reject(new Error('Failed to encode file as base64'));
      reader.readAsDataURL(blob);
    });

  const getOutputFilename = (withUniqueSuffix = false) => {
    if (!output) return 'parikshasnap-output.jpg';
    const ext = getExtensionFromFormat(output.format);
    const baseName = activePreset.id === 'custom-free' ? 'resized-image' : activePreset.id;
    const suffix = withUniqueSuffix ? `-${Date.now().toString().slice(-5)}` : '';
    return `${baseName}-${output.width}x${output.height}${suffix}.${ext}`;
  };

  const handleDownload = async () => {
    if (!output) return;
    setErrorMsg(null);
    setSaveBanner(null);

    if (Capacitor.isNativePlatform()) {
      const uniqueFilename = getOutputFilename(true);
      try {
        const base64Data = await blobToBase64(output.blob);

        try {
          await Filesystem.requestPermissions();
        } catch {
          // Android 13+ may not need legacy storage prompt
        }

        try {
          await Filesystem.writeFile({
            path: `ParikshaSnap/${uniqueFilename}`,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });
          setSaveBanner(`${t.savedNotice} Documents/ParikshaSnap/${uniqueFilename}`);
          return;
        } catch {
          try {
            await Filesystem.writeFile({
              path: `ParikshaSnap/${uniqueFilename}`,
              data: base64Data,
              directory: Directory.External,
              recursive: true,
            });
            setSaveBanner(`${t.savedNotice} Android/data/.../ParikshaSnap/${uniqueFilename}`);
            return;
          } catch {
            const cached = await Filesystem.writeFile({
              path: uniqueFilename,
              data: base64Data,
              directory: Directory.Cache,
            });
            await Share.share({
              title: uniqueFilename,
              files: [cached.uri],
              dialogTitle: uniqueFilename,
            });
            setSaveBanner(`${t.savedNotice} ${uniqueFilename}`);
            return;
          }
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setErrorMsg(err instanceof Error ? err.message : 'Failed to save file on device');
        return;
      }
    }

    const filename = getOutputFilename(false);
    const isGenericAndroidWebView = /Android/i.test(navigator.userAgent) && /; wv\)/i.test(navigator.userAgent);

    if (isGenericAndroidWebView) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to prepare file'));
        reader.readAsDataURL(output.blob);
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSaveBanner(`${t.savedNotice} ${filename}`);
      return;
    }

    const link = document.createElement('a');
    link.href = output.objectUrl;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSaveBanner(`${t.savedNotice} ${filename}`);
  };

  const handleShare = async () => {
    if (!output) return;
    setErrorMsg(null);
    const filename = getOutputFilename(true);

    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = await blobToBase64(output.blob);
        const cached = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
        });
        await Share.share({
          title: filename,
          files: [cached.uri],
          dialogTitle: filename,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setErrorMsg(err instanceof Error ? err.message : 'Unable to share file');
        return;
      }
    }

    const file = new File([output.blob], filename, { type: output.format });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: filename,
          files: [file],
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    await handleDownload();
  };

  const handlePreviewPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (previewTab !== 'processed' || !sourceImgEl) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragPanRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origPanX: settings.panX,
      origPanY: settings.panY,
    };
  };

  const handlePreviewPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragPanRef.current.active) return;
    const dx = (e.clientX - dragPanRef.current.startX) / 140;
    const dy = (e.clientY - dragPanRef.current.startY) / 140;
    setSettings((prev) => ({
      ...prev,
      panX: Math.max(-1, Math.min(1, dragPanRef.current.origPanX + dx)),
      panY: Math.max(-1, Math.min(1, dragPanRef.current.origPanY + dy)),
    }));
  };

  const handlePreviewPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragPanRef.current.active) return;
    dragPanRef.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if already released
    }
  };

  const outputKB = output ? output.sizeBytes / 1024 : 0;
  const isOverMax = output ? outputKB > settings.maxKB : false;
  const isBelowMin =
    output && activePreset.id !== 'custom-free' ? outputKB < activePreset.minKB : false;
  const isPngOver = settings.format === 'image/png' && isOverMax;

  const kbUsagePercent = output
    ? Math.min(100, Math.round((outputKB / Math.max(1, settings.maxKB)) * 100))
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label={t.uploadBtn}
      />

      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#workspace"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            {t.brand}
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#presets"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.navPresets}
            </a>
            <a
              href="#workspace"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.navWorkspace}
            </a>
            <a
              href="#guide"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.navGuide}
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>{t.uploadBtn}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 lg:pb-16">
        {/* Hero & Utility Strip */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-blue-700 mb-2">
                {t.offlineBadge}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                {t.heroTitle}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                {t.heroSub}
              </p>
            </div>

            {/* Workspace Toolbar: Language Switcher + Quick Sample Tests */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div
                role="group"
                aria-label="Language"
                className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => setLang('hi')}
                  className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    lang === 'hi'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  हिंदी
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    lang === 'en'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleLoadSample('photo')}
                className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.samplePhotoBtn}
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('signature')}
                className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.sampleSignBtn}
              </button>
            </div>
          </div>
        </section>

        {/* Main Studio Workspace */}
        <section id="workspace" className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT PANEL: Presets & Controls */}
            <div
              id="presets"
              className="lg:col-span-5 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200"
            >
              {/* 1. Exam Presets */}
              <div className="p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="font-display text-sm font-semibold text-slate-900">
                    {t.presetsHeading}
                  </h2>
                </div>

                {/* Category Segmented Tabs */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg mb-4">
                  {(
                    [
                      { id: 'rrb', label: t.categoryRrb },
                      { id: 'vyapam', label: t.categoryVyapam },
                      { id: 'custom', label: t.categoryCustom },
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySwitch(cat.id)}
                      className={`min-h-[40px] px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                        activeCategory === cat.id
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Preset List */}
                <div className="space-y-2">
                  {filteredPresets.map((preset) => {
                    const isSelected = settings.presetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => selectPreset(preset.id)}
                        className={`w-full text-left px-3.5 py-3 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-600 text-slate-900'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {lang === 'hi' ? preset.labelHi : preset.labelEn}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
                          <span>
                            {preset.width}×{preset.height} px
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {preset.minKB}–{preset.maxKB} KB
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{preset.format.split('/')[1].toUpperCase()}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 leading-snug">
                          {lang === 'hi' ? preset.noteHi : preset.noteEn}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Dimensions & Fit Mode */}
              <div className="p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2 className="font-display text-sm font-semibold text-slate-900">
                    {t.dimensionsHeading}
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, lockAspect: !prev.lockAspect }))
                    }
                    className={`min-h-[34px] px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      settings.lockAspect
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {settings.lockAspect ? (
                      <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{t.lockRatioLabel}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label
                      htmlFor="input-width"
                      className="block text-xs font-medium text-slate-600 mb-1.5"
                    >
                      {t.widthLabel}
                    </label>
                    <div className="relative">
                      <input
                        id="input-width"
                        type="text"
                        inputMode="numeric"
                        value={widthDraft}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setWidthDraft(raw);
                          if (raw !== '') {
                            const num = Number(raw);
                            if (num >= 16 && num <= 4000) {
                              handleWidthChange(num);
                            }
                          }
                        }}
                        onBlur={() => {
                          const clamped = Math.max(16, Math.min(4000, Number(widthDraft) || settings.width));
                          handleWidthChange(clamped);
                          setWidthDraft(String(clamped));
                        }}
                        className="w-full min-h-[42px] pl-3 pr-9 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                        px
                      </span>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="input-height"
                      className="block text-xs font-medium text-slate-600 mb-1.5"
                    >
                      {t.heightLabel}
                    </label>
                    <div className="relative">
                      <input
                        id="input-height"
                        type="text"
                        inputMode="numeric"
                        value={heightDraft}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setHeightDraft(raw);
                          if (raw !== '') {
                            const num = Number(raw);
                            if (num >= 16 && num <= 4000) {
                              handleHeightChange(num);
                            }
                          }
                        }}
                        onBlur={() => {
                          const clamped = Math.max(16, Math.min(4000, Number(heightDraft) || settings.height));
                          handleHeightChange(clamped);
                          setHeightDraft(String(clamped));
                        }}
                        className="w-full min-h-[42px] pl-3 pr-9 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                        px
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-600 mb-1.5">
                    {t.fitModeLabel}
                  </span>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                    {(
                      [
                        { id: 'cover', label: t.fitCover },
                        { id: 'contain', label: t.fitContain },
                        { id: 'stretch', label: t.fitStretch },
                      ] as { id: FitMode; label: string }[]
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            fitMode: mode.id,
                            panX: 0,
                            panY: 0,
                          }))
                        }
                        className={`min-h-[38px] px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                          settings.fitMode === mode.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Max Size KB & Format */}
              <div className="p-5">
                <h2 className="font-display text-sm font-semibold text-slate-900 mb-3">
                  {t.compressionHeading}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label
                      htmlFor="input-max-kb"
                      className="block text-xs font-medium text-slate-600 mb-1.5"
                    >
                      {t.maxSizeLabel}
                    </label>
                    <div className="relative">
                      <input
                        id="input-max-kb"
                        type="text"
                        inputMode="numeric"
                        placeholder={lang === 'hi' ? 'जैसे 45' : 'e.g. 45'}
                        value={kbDraft}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setKbDraft(raw);
                          if (raw !== '') {
                            const num = Number(raw);
                            if (num >= 5 && num <= 5000) {
                              setSettings((prev) => ({ ...prev, maxKB: num }));
                            }
                          }
                        }}
                        onBlur={() => {
                          const clamped = Math.max(
                            5,
                            Math.min(5000, Number(kbDraft) || activePreset.defaultMaxKB)
                          );
                          setSettings((prev) => ({ ...prev, maxKB: clamped }));
                          setKbDraft(String(clamped));
                        }}
                        className="w-full min-h-[42px] pl-3 pr-10 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-medium text-slate-400">
                        KB
                      </span>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="select-format"
                      className="block text-xs font-medium text-slate-600 mb-1.5"
                    >
                      {t.formatLabel}
                    </label>
                    <select
                      id="select-format"
                      value={settings.format}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          format: e.target.value as OutputFormat,
                        }))
                      }
                      className="w-full min-h-[42px] px-3 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="image/jpeg">JPEG (.jpg)</option>
                      <option value="image/webp">WEBP (.webp)</option>
                      <option value="image/png">PNG (.png)</option>
                      <option value="application/pdf">PDF (.pdf)</option>
                    </select>
                  </div>
                </div>

                {/* Quick KB Target Buttons */}
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {[20, 35, 50, 100, 200].map((kbVal) => (
                    <button
                      key={kbVal}
                      type="button"
                      onClick={() => {
                        setSettings((prev) => ({ ...prev, maxKB: kbVal }));
                        setKbDraft(String(kbVal));
                      }}
                      className={`min-h-[36px] px-2 py-1 text-xs font-mono tabular-nums rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                        settings.maxKB === kbVal
                          ? 'bg-blue-50 border-blue-600 text-blue-700 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {kbVal} KB
                    </button>
                  ))}
                </div>

                <div>
                  <input
                    type="range"
                    aria-label={t.maxSizeLabel}
                    min={10}
                    max={activePreset.id === 'custom-free' ? 1000 : Math.max(300, activePreset.maxKB)}
                    step={5}
                    value={Math.min(
                      activePreset.id === 'custom-free' ? 1000 : Math.max(300, activePreset.maxKB),
                      Math.max(10, settings.maxKB)
                    )}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, maxKB: Number(e.target.value) }))
                    }
                    className="w-full accent-blue-700 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums mt-1">
                    <span>10 KB</span>
                    <span>
                      {t.targetRangeLabel}: {activePreset.minKB}–{activePreset.maxKB} KB
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Crop, Rotate & Exam Enhancements */}
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-semibold text-slate-900">
                    {t.adjustmentsHeading}
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        rotation: 0,
                        zoom: 1,
                        panX: 0,
                        panY: 0,
                      }))
                    }
                    className="text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer whitespace-nowrap"
                  >
                    {t.resetFraming}
                  </button>
                </div>

                {/* Rotation + Zoom */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        rotation: (prev.rotation + 270) % 360,
                      }))
                    }
                    className="flex-1 min-h-[42px] px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.rotateLeft}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        rotation: (prev.rotation + 90) % 360,
                      }))
                    }
                    className="flex-1 min-h-[42px] px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.rotateRight}</span>
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-600">{t.zoomLabel}</span>
                    <span className="font-mono tabular-nums text-slate-700">
                      {settings.zoom.toFixed(2)}×
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={t.zoomLabel}
                    min={1}
                    max={2.5}
                    step={0.05}
                    value={settings.zoom}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, zoom: Number(e.target.value) }))
                    }
                    className="w-full accent-blue-700 cursor-pointer"
                  />
                </div>

                {/* Signature Ink Boost */}
                <label className="flex items-start gap-3 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.signatureBoost}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, signatureBoost: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <div className="text-xs">
                    <div className="font-medium text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                      <span>{t.signatureBoostLabel}</span>
                    </div>
                    <p className="text-slate-500 mt-0.5">{t.signatureBoostHint}</p>
                  </div>
                </label>

                {/* Name & Date Strip */}
                <div className="pt-1">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.addNameDate}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, addNameDate: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    <span className="text-xs font-medium text-slate-900 inline-flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                      <span>{t.nameDateLabel}</span>
                    </span>
                  </label>

                  {settings.addNameDate && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        value={settings.stampName}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, stampName: e.target.value }))
                        }
                        placeholder={t.namePlaceholder}
                        className="min-h-[40px] px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                      <input
                        type="text"
                        value={settings.stampDate}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, stampDate: e.target.value }))
                        }
                        placeholder={t.datePlaceholder}
                        className="min-h-[40px] px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Live Canvas Preview & Export */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              {/* Preview Header */}
              <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('processed')}
                    className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      previewTab === 'processed'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.viewProcessed}
                  </button>
                  <button
                    type="button"
                    disabled={!sourceInfo}
                    onClick={() => setPreviewTab('compare')}
                    className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      previewTab === 'compare'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.viewCompare}
                  </button>
                  <button
                    type="button"
                    disabled={!sourceInfo}
                    onClick={() => setPreviewTab('original')}
                    className={`min-h-[36px] px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      previewTab === 'original'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.viewOriginal}
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-mono tabular-nums flex items-center gap-2">
                  <span>
                    {settings.width} × {settings.height} px
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{settings.format.split('/')[1].toUpperCase()}</span>
                </div>
              </div>

              {/* Preview Stage / Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) loadImageFile(file);
                }}
                className={`relative min-h-[340px] sm:min-h-[420px] p-2 sm:p-4 flex flex-col items-center justify-center transition-colors ${
                  sourceInfo ? 'bg-slate-100/70' : 'bg-slate-50 p-6'
                } ${isDraggingFile ? 'ring-2 ring-inset ring-blue-600 bg-blue-50/40' : ''}`}
              >
                {!sourceInfo ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    className="w-full max-w-md border-2 border-dashed border-slate-300 hover:border-blue-600 bg-white rounded-xl p-8 text-center cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-4">
                      <ImagePlus className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-base font-semibold text-slate-900">
                      {t.dropTitle}
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600">{t.dropSub}</p>
                    <p className="mt-4 text-xs text-slate-500">{t.dropHint}</p>
                  </div>
                ) : previewTab === 'compare' && output ? (
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="flex flex-col items-center">
                      <div className="w-full flex items-center justify-between text-xs text-slate-500 mb-1.5 font-mono tabular-nums">
                        <span className="font-sans font-medium text-slate-700">
                          {t.originalLabel}
                        </span>
                        <span>
                          {sourceInfo.width}×{sourceInfo.height} · {formatBytes(sourceInfo.sizeBytes)}
                        </span>
                      </div>
                      <img
                        src={sourceInfo.objectUrl}
                        alt="Original image comparison"
                        className="max-h-[260px] w-auto object-contain block"
                      />
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-full flex items-center justify-between text-xs text-blue-700 mb-1.5 font-mono tabular-nums">
                        <span className="font-sans font-semibold">{t.outputLabel}</span>
                        <span>
                          {output.width}×{output.height} · {formatBytes(output.sizeBytes)}
                        </span>
                      </div>
                      <img
                        src={output.previewObjectUrl}
                        alt="Processed image comparison"
                        className="max-h-[260px] w-auto object-contain block"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div
                      onPointerDown={handlePreviewPointerDown}
                      onPointerMove={handlePreviewPointerMove}
                      onPointerUp={handlePreviewPointerUp}
                      onPointerCancel={handlePreviewPointerUp}
                      className={`relative max-w-full max-h-[380px] overflow-hidden select-none ${
                        previewTab === 'processed' ? 'cursor-grab active:cursor-grabbing' : ''
                      }`}
                      style={{ touchAction: 'none' }}
                    >
                      {previewTab === 'processed' && output ? (
                        <img
                          src={output.previewObjectUrl}
                          alt="Processed exam output preview"
                          draggable={false}
                          className="max-h-[360px] w-auto object-contain block"
                        />
                      ) : (
                        <img
                          src={sourceInfo.objectUrl}
                          alt="Original uploaded preview"
                          draggable={false}
                          className="max-h-[360px] w-auto object-contain block"
                        />
                      )}
                    </div>

                    {previewTab === 'processed' && (
                      <p className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t.dragHint}</span>
                      </p>
                    )}
                  </div>
                )}

                {errorMsg && (
                  <div className="mt-4 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {errorMsg}
                  </div>
                )}
              </div>

              {/* Telemetry & Export Footer */}
              <div className="p-5 border-t border-slate-200 bg-white space-y-4">
                {sourceInfo && output ? (
                  <>
                    {/* Tabular Spec Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <span className="block text-xs text-slate-500">{t.originalLabel}</span>
                        <span className="mt-0.5 block text-sm font-mono tabular-nums font-medium text-slate-900">
                          {formatBytes(sourceInfo.sizeBytes)}
                        </span>
                        <span className="block text-xs font-mono tabular-nums text-slate-500">
                          {sourceInfo.width}×{sourceInfo.height} px
                        </span>
                      </div>

                      <div>
                        <span className="block text-xs text-slate-500">{t.outputLabel}</span>
                        <span className="mt-0.5 block text-sm font-mono tabular-nums font-semibold text-blue-700">
                          {formatBytes(output.sizeBytes)}
                        </span>
                        <span className="block text-xs font-mono tabular-nums text-slate-500">
                          {output.width}×{output.height} px
                        </span>
                      </div>

                      <div>
                        <span className="block text-xs text-slate-500">{t.qualityLabel}</span>
                        <span className="mt-0.5 block text-sm font-mono tabular-nums font-medium text-slate-900">
                          {output.format === 'image/png'
                            ? '100%'
                            : `${Math.round(output.qualityUsed * 100)}%`}
                        </span>
                        <span className="block text-xs font-mono tabular-nums text-slate-500">
                          {output.processingMs} ms
                        </span>
                      </div>

                      <div>
                        <span className="block text-xs text-slate-500">{t.targetRangeLabel}</span>
                        <span className="mt-0.5 block text-sm font-mono tabular-nums font-medium text-slate-900">
                          ≤ {settings.maxKB} KB
                        </span>
                        <span className="block text-xs font-mono tabular-nums text-slate-500">
                          {activePreset.minKB}–{activePreset.maxKB} KB
                        </span>
                      </div>
                    </div>

                    {/* KB Budget Meter & Explicit Status */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-1.5 font-medium">
                          {isPngOver ? (
                            <>
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span className="text-amber-700">{t.statusPngWarn}</span>
                            </>
                          ) : isOverMax ? (
                            <>
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span className="text-amber-700">{t.statusOverMax}</span>
                            </>
                          ) : isBelowMin ? (
                            <>
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span className="text-amber-700">{t.statusBelowMin}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span className="text-emerald-700">{t.statusWithinRange}</span>
                            </>
                          )}
                        </div>
                        <span className="font-mono tabular-nums text-slate-600 shrink-0">
                          {kbUsagePercent}%
                        </span>
                      </div>

                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-200 ${
                            isOverMax || isBelowMin ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${kbUsagePercent}%` }}
                        />
                      </div>

                      {activePreset.id !== 'custom-free' &&
                        settings.format !== activePreset.format && (
                          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                            <span>{t.statusFormatMismatch}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setSettings((prev) => ({ ...prev, format: activePreset.format }))
                              }
                              className="px-2.5 py-1 rounded bg-white border border-amber-300 text-amber-900 font-medium hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              {t.fixFormatBtn}
                            </button>
                          </div>
                        )}
                    </div>

                    {/* Primary Action Row */}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleDownload}
                        className="flex-1 min-h-[44px] px-5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
                        <span>{t.downloadBtn}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleShare}
                        className="min-h-[44px] px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" aria-hidden="true" />
                        <span>{t.shareBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="min-h-[44px] px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Upload className="w-4 h-4" aria-hidden="true" />
                        <span>{t.uploadBtn}</span>
                      </button>
                    </div>

                    {saveBanner && (
                      <div className="px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{saveBanner}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <span>
                      {lang === 'hi'
                        ? 'प्रीव्यू और KB कम्प्रेशन देखने के लिए ऊपर इमेज अपलोड करें या सैंपल बटन चुनें।'
                        : 'Upload an image or load a sample above to preview live Canvas resizing.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[40px] px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.uploadBtn}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Official Exam Specs Reference Table */}
        <section id="guide" className="max-w-7xl mx-auto px-4 sm:px-6 pt-14">
          <div className="mb-5">
            <h2 className="font-display text-xl font-bold text-slate-900">{t.guideTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{t.guideSub}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">{t.colExam}</th>
                  <th className="py-3 px-4">{t.colDim}</th>
                  <th className="py-3 px-4">{t.colSize}</th>
                  <th className="py-3 px-4">{t.colFormat}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {EXAM_PRESETS.filter((p) => p.category !== 'custom').map((preset) => (
                  <tr
                    key={preset.id}
                    onClick={() => {
                      setActiveCategory(preset.category);
                      selectPreset(preset.id);
                      document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">
                        {lang === 'hi' ? preset.labelHi : preset.labelEn}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {lang === 'hi' ? preset.noteHi : preset.noteEn}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {preset.width} × {preset.height} px
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {preset.minKB}–{preset.maxKB} KB
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {preset.format.split('/')[1].toUpperCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Client-Side Architecture Overview */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12">
          <h2 className="font-display text-xl font-bold text-slate-900 mb-5">
            {t.architectureTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {t.architectureSteps.map((step) => (
              <div
                key={step.title}
                className="bg-white border border-slate-200 rounded-xl p-5"
              >
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Mobile Sticky Bottom Download CTA (only shown when output is ready) */}
      {sourceInfo && output && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
          {(saveBanner || errorMsg) && (
            <div
              className={`mb-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium truncate ${
                errorMsg
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {errorMsg || saveBanner}
            </div>
          )}
          <div className="flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-xs font-mono tabular-nums font-semibold text-slate-900 truncate">
                {output.width}×{output.height} px · {formatBytes(output.sizeBytes)}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {isOverMax || isBelowMin ? t.statusOverMax : t.statusWithinRange}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleShare}
                aria-label={t.shareBtn}
                className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 inline-flex items-center justify-center cursor-pointer"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDownload}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>{lang === 'hi' ? 'डाउनलोड' : 'Download'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
