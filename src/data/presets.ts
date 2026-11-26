import { ExamPreset, Language } from '../types/resizer';

export const EXAM_PRESETS: ExamPreset[] = [
  {
    id: 'rrb-photo',
    category: 'rrb',
    kind: 'photo',
    labelHi: 'RRB पासपोर्ट फ़ोटो (CEN / NTPC / Group D)',
    labelEn: 'RRB Passport Photo (CEN / NTPC / Group D)',
    width: 350,
    height: 450,
    minKB: 20,
    maxKB: 50,
    defaultMaxKB: 45,
    format: 'image/jpeg',
    fitMode: 'cover',
    noteHi: 'सफ़ेद बैकग्राउंड, 3.5 × 4.5 सेमी अनुपात, स्पष्ट चेहरा बिना चश्मे के।',
    noteEn: 'White background, 3.5 × 4.5 cm ratio, clear face without dark glasses.',
    dpiLabel: '200 DPI',
  },
  {
    id: 'rrb-sign',
    category: 'rrb',
    kind: 'signature',
    labelHi: 'RRB हस्ताक्षर (Running Hand Signature)',
    labelEn: 'RRB Signature (Running Hand)',
    width: 350,
    height: 150,
    minKB: 10,
    maxKB: 40,
    defaultMaxKB: 35,
    format: 'image/jpeg',
    fitMode: 'contain',
    noteHi: 'सफ़ेद कागज़ पर काले/नीले पेन से रनिंग हैंड हस्ताक्षर (ब्लॉक लेटर नहीं)।',
    noteEn: 'Black/blue ink on white paper in running hand (no capital block letters).',
    dpiLabel: '200 DPI',
  },
  {
    id: 'rrb-doc',
    category: 'rrb',
    kind: 'document',
    labelHi: 'RRB जाति / प्रमाणपत्र स्कैन',
    labelEn: 'RRB Caste / Certificate Scan',
    width: 800,
    height: 1100,
    minKB: 50,
    maxKB: 300,
    defaultMaxKB: 250,
    format: 'image/jpeg',
    fitMode: 'contain',
    noteHi: 'साफ़ और पठनीय दस्तावेज़ स्कैन, अधिकतम 300 KB तक।',
    noteEn: 'Clear legible certificate scan, compressed safely under 300 KB.',
    dpiLabel: '150 DPI',
  },
  {
    id: 'vyapam-photo',
    category: 'vyapam',
    kind: 'photo',
    labelHi: 'व्यापम / MPESB पासपोर्ट फ़ोटो',
    labelEn: 'Vyapam / MPESB Passport Photo',
    width: 300,
    height: 380,
    minKB: 20,
    maxKB: 200,
    defaultMaxKB: 100,
    format: 'image/jpeg',
    fitMode: 'cover',
    noteHi: 'MPESB प्रोफ़ाइल के लिए 4 × 5 सेमी फ़ोटो, नाम व तारीख़ पट्टी वैकल्पिक।',
    noteEn: '4 × 5 cm portrait for MPESB profile; optional name & date strip supported.',
    dpiLabel: '200 DPI',
  },
  {
    id: 'vyapam-sign',
    category: 'vyapam',
    kind: 'signature',
    labelHi: 'व्यापम / MPESB हस्ताक्षर',
    labelEn: 'Vyapam / MPESB Signature',
    width: 300,
    height: 120,
    minKB: 10,
    maxKB: 100,
    defaultMaxKB: 50,
    format: 'image/jpeg',
    fitMode: 'contain',
    noteHi: 'हस्ताक्षर बॉक्स के अंदर साफ़ दिखे, अनावश्यक मार्जिन हटाएँ।',
    noteEn: 'Crisp dark signature centered inside white box without excess shadow.',
    dpiLabel: '200 DPI',
  },
  {
    id: 'vyapam-template',
    category: 'vyapam',
    kind: 'template',
    labelHi: 'व्यापम घोषणापत्र / बड़ा दस्तावेज़',
    labelEn: 'Vyapam Self-Declaration / Proforma',
    width: 700,
    height: 900,
    minKB: 40,
    maxKB: 200,
    defaultMaxKB: 180,
    format: 'image/jpeg',
    fitMode: 'contain',
    noteHi: 'MPESB टेम्पलेट शीट या स्व-घोषणा स्कैन के लिए उपयुक्त।',
    noteEn: 'Ideal for MPESB template sheet or handwritten self-declaration scan.',
    dpiLabel: '150 DPI',
  },
  {
    id: 'custom-free',
    category: 'custom',
    kind: 'photo',
    labelHi: 'कस्टम साइज़ (अपनी मर्ज़ी के पिक्सेल और KB)',
    labelEn: 'Custom Dimensions & KB Target',
    width: 600,
    height: 600,
    minKB: 5,
    maxKB: 2000,
    defaultMaxKB: 150,
    format: 'image/jpeg',
    fitMode: 'cover',
    noteHi: 'किसी भी पोर्टल (SSC, UPSC, Banking, State PSC) के लिए कस्टम मान दर्ज करें।',
    noteEn: 'Set exact width, height, KB limit, and format for any portal.',
    dpiLabel: 'Custom',
  },
];

export const COPY: Record<Language, {
  brand: string;
  navPresets: string;
  navWorkspace: string;
  navGuide: string;
  uploadBtn: string;
  heroTitle: string;
  heroSub: string;
  offlineBadge: string;
  samplePhotoBtn: string;
  sampleSignBtn: string;
  categoryRrb: string;
  categoryVyapam: string;
  categoryCustom: string;
  presetsHeading: string;
  dimensionsHeading: string;
  widthLabel: string;
  heightLabel: string;
  lockRatioLabel: string;
  fitModeLabel: string;
  fitCover: string;
  fitContain: string;
  fitStretch: string;
  compressionHeading: string;
  maxSizeLabel: string;
  formatLabel: string;
  adjustmentsHeading: string;
  rotateLeft: string;
  rotateRight: string;
  zoomLabel: string;
  resetFraming: string;
  signatureBoostLabel: string;
  signatureBoostHint: string;
  nameDateLabel: string;
  namePlaceholder: string;
  datePlaceholder: string;
  dropTitle: string;
  dropSub: string;
  dropHint: string;
  viewProcessed: string;
  viewCompare: string;
  viewOriginal: string;
  originalLabel: string;
  outputLabel: string;
  qualityLabel: string;
  targetRangeLabel: string;
  statusWithinRange: string;
  statusBelowMin: string;
  statusOverMax: string;
  statusPngWarn: string;
  statusFormatMismatch: string;
  fixFormatBtn: string;
  errInvalidFile: string;
  errTooLargeFile: string;
  errDecodeFailed: string;
  downloadBtn: string;
  shareBtn: string;
  savedNotice: string;
  dragHint: string;
  guideTitle: string;
  guideSub: string;
  colExam: string;
  colDim: string;
  colSize: string;
  colFormat: string;
  architectureTitle: string;
  architectureSteps: { title: string; desc: string }[];
}> = {
  hi: {
    brand: 'ParikshaSnap',
    navPresets: 'प्रीसेट्स',
    navWorkspace: 'वर्कस्पेस',
    navGuide: 'गाइड',
    uploadBtn: 'इमेज अपलोड करें',
    heroTitle: 'RRB और व्यापम फ़ॉर्म के लिए सटीक इमेज रिसाइज़र',
    heroSub: 'बिना किसी बाहरी सर्वर के सीधे ब्राउज़र में HTML5 Canvas से फ़ोटो, हस्ताक्षर और दस्तावेज़ को पिक्सेल व KB सीमा के अनुसार तैयार करें।',
    offlineBadge: '100% ऑफ़लाइन ब्राउज़र इंजन · Capacitor APK रेडी',
    samplePhotoBtn: 'सैंपल फ़ोटो टेस्ट करें',
    sampleSignBtn: 'सैंपल हस्ताक्षर टेस्ट करें',
    categoryRrb: 'रेलवे (RRB)',
    categoryVyapam: 'व्यापम / MPESB',
    categoryCustom: 'कस्टम',
    presetsHeading: '1. परीक्षा प्रीसेट चुनें',
    dimensionsHeading: '2. चौड़ाई और ऊँचाई (px)',
    widthLabel: 'चौड़ाई (Width)',
    heightLabel: 'ऊँचाई (Height)',
    lockRatioLabel: 'अनुपात लॉक करें',
    fitModeLabel: 'फ़िट मोड',
    fitCover: 'फ़िल व क्रॉप',
    fitContain: 'सफ़ेद मार्जिन',
    fitStretch: 'स्ट्रेच',
    compressionHeading: '3. अधिकतम फ़ाइल साइज़ व फ़ॉर्मेट',
    maxSizeLabel: 'अधिकतम साइज़ (KB)',
    formatLabel: 'आउटपुट फ़ॉर्मेट',
    adjustmentsHeading: '4. क्रॉप, रोटेट और एन्हांसमेंट',
    rotateLeft: '90° बाएँ',
    rotateRight: '90° दाएँ',
    zoomLabel: 'ज़ूम स्तर',
    resetFraming: 'रीसेट',
    signatureBoostLabel: 'हस्ताक्षर इंक साफ़ करें',
    signatureBoostHint: 'कागज़ की छाया हटाकर स्याही को गहरा बनाता है',
    nameDateLabel: 'फ़ोटो पर नाम व तारीख़ पट्टी जोड़ें',
    namePlaceholder: 'अभ्यर्थी का नाम (उदा. RAHUL SHARMA)',
    datePlaceholder: 'DOP: 26/11/2026',
    dropTitle: 'यहाँ फ़ोटो, हस्ताक्षर या दस्तावेज़ ड्रॉप करें',
    dropSub: 'या डिवाइस गैलरी / कंप्यूटर से चुनने के लिए क्लिक करें',
    dropHint: 'JPG, PNG, WEBP समर्थित · कोई फ़ाइल सर्वर पर नहीं भेजी जाती',
    viewProcessed: 'आउटपुट',
    viewCompare: 'तुलना',
    viewOriginal: 'मूल इमेज',
    originalLabel: 'मूल फ़ाइल',
    outputLabel: 'तैयार आउटपुट',
    qualityLabel: 'क्वालिटी',
    targetRangeLabel: 'पोर्टल सीमा',
    statusWithinRange: 'फॉर्म अपलोड के लिए पूरी तरह तैयार',
    statusBelowMin: 'न्यूनतम KB सीमा से कम — थोड़ा बड़ा लक्ष्य या उच्च क्वालिटी रखें',
    statusOverMax: 'निर्धारित KB सीमा से अधिक — JPEG चुनें या साइज़ घटाएँ',
    statusPngWarn: 'PNG लॉसलेस है; सटीक KB के लिए JPEG चुनें',
    statusFormatMismatch: 'यह परीक्षा प्रीसेट पोर्टल पर JPEG (.jpg) फ़ॉर्मेट मांगता है',
    fixFormatBtn: 'JPEG पर सेट करें',
    errInvalidFile: 'कृपया सही इमेज फ़ाइल चुनें (JPG, PNG, या WEBP)।',
    errTooLargeFile: 'फ़ाइल बहुत बड़ी है (50 MB से कम की इमेज चुनें)।',
    errDecodeFailed: 'यह इमेज फ़ाइल खोली नहीं जा सकी। कृपया JPG या PNG आज़माएँ।',
    downloadBtn: 'डाउनलोड / सेव करें',
    shareBtn: 'शेयर करें',
    savedNotice: 'फ़ाइल सफलतापूर्वक सेव हो गई:',
    dragHint: 'फ़्रेम एडजस्ट करने के लिए प्रीव्यू को ड्रैग करें',
    guideTitle: 'आधिकारिक परीक्षा विनिर्देश संदर्भ (RRB और MPESB)',
    guideSub: 'फ़ॉर्म भरने से पहले सही पिक्सेल अनुपात और KB सीमा की जाँच करें।',
    colExam: 'परीक्षा व प्रकार',
    colDim: 'पिक्सेल (W × H)',
    colSize: 'स्वीकार्य KB',
    colFormat: 'फ़ॉर्मेट',
    architectureTitle: 'यह ऑफ़लाइन हाइब्रिड इंजन कैसे काम करता है',
    architectureSteps: [
      {
        title: '01. लोकल FileReader डिकोडिंग',
        desc: 'अपलोड की गई इमेज केवल आपके डिवाइस की मेमोरी (Object URL) में लोड होती है। कोई भी डेटा बाहरी सर्वर या Render पर नहीं जाता।',
      },
      {
        title: '02. HTML5 Canvas ट्रांसफ़ॉर्म व फ़िल्टर',
        desc: 'कैनवास तय पिक्सेल पर क्रॉप, रोटेट, सफ़ेद बैकग्राउंड पैडिंग, हस्ताक्षर कॉन्ट्रास्ट बूस्ट और नाम-तारीख़ पट्टी रेंडर करता है।',
      },
      {
        title: '03. बाइनरी-सर्च KB कम्प्रेशन',
        desc: 'canvas.toBlob() पर 8 चरणों की बाइनरी सर्च चलकर अधिकतम संभावित क्वालिटी के साथ फ़ाइल को ठीक आपके KB लक्ष्य के भीतर लाती है।',
      },
    ],
  },
  en: {
    brand: 'ParikshaSnap',
    navPresets: 'Presets',
    navWorkspace: 'Workspace',
    navGuide: 'Specs Guide',
    uploadBtn: 'Upload Image',
    heroTitle: 'Precision Image Resizer for RRB & Vyapam Forms',
    heroSub: 'Resize, crop, enhance signatures, and compress photos to exact KB limits directly inside your browser using HTML5 Canvas — zero external servers.',
    offlineBadge: '100% Client-Side Canvas Engine · Capacitor Ready',
    samplePhotoBtn: 'Try Sample Photo',
    sampleSignBtn: 'Try Sample Signature',
    categoryRrb: 'Railway (RRB)',
    categoryVyapam: 'Vyapam / MPESB',
    categoryCustom: 'Custom',
    presetsHeading: '1. Select Exam Preset',
    dimensionsHeading: '2. Dimensions (px)',
    widthLabel: 'Width (px)',
    heightLabel: 'Height (px)',
    lockRatioLabel: 'Lock aspect ratio',
    fitModeLabel: 'Fit Mode',
    fitCover: 'Fill & Crop',
    fitContain: 'White Margin',
    fitStretch: 'Stretch',
    compressionHeading: '3. Max File Size & Format',
    maxSizeLabel: 'Max File Size (KB)',
    formatLabel: 'Output Format',
    adjustmentsHeading: '4. Crop, Rotate & Enhancements',
    rotateLeft: '90° Left',
    rotateRight: '90° Right',
    zoomLabel: 'Zoom',
    resetFraming: 'Reset',
    signatureBoostLabel: 'Clean Signature Ink',
    signatureBoostHint: 'Removes paper shadow and darkens pen strokes',
    nameDateLabel: 'Add Name & Photo Date Strip',
    namePlaceholder: 'Candidate Name (e.g. RAHUL SHARMA)',
    datePlaceholder: 'DOP: 26/11/2026',
    dropTitle: 'Drop photo, signature, or certificate here',
    dropSub: 'or click to browse from your device storage',
    dropHint: 'Supports JPG, PNG, WEBP · Processed locally, never uploaded',
    viewProcessed: 'Output',
    viewCompare: 'Compare',
    viewOriginal: 'Original',
    originalLabel: 'Original',
    outputLabel: 'Processed',
    qualityLabel: 'Quality',
    targetRangeLabel: 'Portal Range',
    statusWithinRange: 'Ready for exam portal upload',
    statusBelowMin: 'Below minimum KB — increase target KB or dimensions',
    statusOverMax: 'Exceeds target KB — switch to JPEG or lower max KB',
    statusPngWarn: 'PNG is lossless; use JPEG for exact KB targeting',
    statusFormatMismatch: 'This exam portal normally requires JPEG (.jpg) format',
    fixFormatBtn: 'Switch to JPEG',
    errInvalidFile: 'Please choose a valid image file (JPG, PNG, or WEBP).',
    errTooLargeFile: 'File exceeds 50 MB limit. Please pick a smaller image.',
    errDecodeFailed: 'Could not decode this image file. Try JPG or PNG.',
    downloadBtn: 'Download / Save File',
    shareBtn: 'Share',
    savedNotice: 'Saved successfully to device:',
    dragHint: 'Drag directly on preview to reposition crop',
    guideTitle: 'Exam Specification Reference (RRB & MPESB)',
    guideSub: 'Verify pixel dimensions and acceptable KB thresholds before submission.',
    colExam: 'Exam & Document',
    colDim: 'Dimensions (W × H)',
    colSize: 'Allowed KB',
    colFormat: 'Format',
    architectureTitle: 'How the Offline Canvas Engine Works',
    architectureSteps: [
      {
        title: '01. Local Memory Decoding',
        desc: 'Your image is read strictly in browser memory via Object URLs. Nothing leaves your phone or desktop.',
      },
      {
        title: '02. HTML5 Canvas Pipeline',
        desc: 'Renders exact pixel geometry, white-margin padding, ink threshold enhancement, and candidate name/date strips.',
      },
      {
        title: '03. Binary-Search KB Targeting',
        desc: 'Runs an 8-step binary search over canvas.toBlob() quality so you keep maximum visual clarity under your exact KB ceiling.',
      },
    ],
  },
};
