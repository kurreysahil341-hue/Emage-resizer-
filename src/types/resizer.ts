export type Language = 'hi' | 'en';

export type ExamCategory = 'rrb' | 'vyapam' | 'ssc' | 'upsc' | 'banking' | 'custom';

export type FitMode = 'cover' | 'contain' | 'stretch';

export type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

export interface ExamPreset {
  id: string;
  category: ExamCategory;
  kind: 'photo' | 'signature' | 'document' | 'template';
  labelHi: string;
  labelEn: string;
  examsHi: string;
  examsEn: string;
  width: number;
  height: number;
  minKB: number;
  maxKB: number;
  defaultMaxKB: number;
  format: OutputFormat;
  fitMode: FitMode;
  noteHi: string;
  noteEn: string;
  dpiLabel: string;
}

export interface ResizeSettings {
  presetId: string;
  width: number;
  height: number;
  lockAspect: boolean;
  fitMode: FitMode;
  maxKB: number;
  format: OutputFormat;
  rotation: number; // 0, 90, 180, 270
  zoom: number; // 1 to 2.5
  panX: number; // -1 to 1
  panY: number; // -1 to 1
  signatureBoost: boolean;
  addNameDate: boolean;
  stampName: string;
  stampDate: string;
  backgroundColor: string;
}

export interface SourceImageInfo {
  name: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  objectUrl: string;
}

export interface ProcessedOutput {
  blob: Blob;
  objectUrl: string;
  previewObjectUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  qualityUsed: number; // 0 to 1
  iterations: number;
  format: OutputFormat;
  downscaledForTarget: boolean;
  processingMs: number;
}
