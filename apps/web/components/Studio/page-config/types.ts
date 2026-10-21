import type { ColoringRegion } from './contourExtractor';

export type { ColoringRegion };

export type InteractiveToolKey =
  | 'select'
  | 'highlight'
  | 'lasso'
  | 'tts'
  | 'audio'
  | 'video'
  | 'zoom'
  | 'blank'
  | 'reveal'
  | 'check'
  | 'button'
  | 'freeColoring'
  | 'colorCorrect'
  | 'paint'
  | 'arrow'
  | 'choice'
  | 'circleExercise'
  | 'dragDrop';

export interface ToolDef {
  n: string;
  ic: string;
  c: string;
  k: 'rect' | 'lasso' | 'pt' | 'arrow';
  w?: number;
  h?: number;
  hint: string;
}

export const TOOL_DEFS: Record<InteractiveToolKey, ToolDef> = {
  select: {
    n: 'Sélectionner',
    ic: 'TextSelect',
    c: '#38bdf8',
    k: 'rect',
    hint: 'Glissez pour sélectionner et copier le texte du document PDF.',
  },
  highlight: {
    n: 'Surligner',
    ic: 'Highlighter',
    c: '#facc15',
    k: 'rect',
    hint: 'Dessinez un rectangle sur le texte à surligner.',
  },
  lasso: {
    n: 'Lasso paragraphe',
    ic: 'Lasso',
    c: '#a78bfa',
    k: 'lasso',
    hint: "Maintenez et tracez librement autour d'un paragraphe.",
  },
  tts: {
    n: 'TTS',
    ic: 'Volume2',
    c: '#38bdf8',
    k: 'rect',
    hint: 'Dessinez une zone : un clic la lira à voix haute.',
  },
  audio: {
    n: 'Audio',
    ic: 'Music',
    c: '#f472b6',
    k: 'pt',
    w: 0.07,
    h: 0.05,
    hint: 'Cliquez pour placer un lecteur audio.',
  },
  video: {
    n: 'Vidéo',
    ic: 'Video',
    c: '#fb7185',
    k: 'rect',
    hint: 'Dessinez la zone qui ouvrira la vidéo.',
  },
  zoom: {
    n: 'Zoom',
    ic: 'ZoomIn',
    c: '#34d399',
    k: 'rect',
    hint: 'Dessinez la zone à agrandir dans une modale HD.',
  },
  blank: {
    n: 'Texte à trou',
    ic: 'TextCursorInput',
    c: '#fbbf24',
    k: 'rect',
    hint: 'Dessinez un rectangle sur le mot à masquer.',
  },
  reveal: {
    n: 'Révéler',
    ic: 'Eye',
    c: '#818cf8',
    k: 'rect',
    hint: "Dessinez la zone à masquer jusqu'au clic.",
  },
  check: {
    n: 'Case à cocher',
    ic: 'CheckSquare',
    c: '#2dd4bf',
    k: 'rect',
    hint: 'Dessinez un rectangle pour positionner et dimensionner la case à cocher.',
  },
  button: {
    n: 'Bouton corriger',
    ic: 'CheckCircle2',
    c: '#f97316',
    k: 'pt',
    w: 0.2,
    h: 0.045,
    hint: 'Cliquez pour placer le bouton de correction.',
  },
  freeColoring: {
    n: 'Coloriage libre',
    ic: 'Palette',
    c: '#ec4899',
    k: 'rect',
    hint: 'Définissez la zone ou illustration où les élèves peuvent colorier librement au pot de peinture.',
  },
  colorCorrect: {
    n: 'Colorier les bons dessins',
    ic: 'PaintBucket',
    c: '#8b5cf6',
    k: 'rect',
    hint: 'Définissez un dessin à identifier par l\'élève (bonne réponse ou distracteur).',
  },
  paint: {
    n: 'Zone à colorier (legacy)',
    ic: 'PaintBucket',
    c: '#ec4899',
    k: 'lasso',
    hint: 'Tracez la zone fermée que les élèves pourront colorier au pot de peinture.',
  },
  arrow: {
    n: 'Flèches',
    ic: 'ArrowUpRight',
    c: '#06b6d4',
    k: 'arrow',
    hint: 'Glissez du point de départ vers le point d\'arrivée pour définir une flèche attendue.',
  },
  choice: {
    n: 'Choix de réponse',
    ic: 'CheckCircle',
    c: '#10b981',
    k: 'rect',
    hint: 'Dessinez un rectangle sur un choix/réponse imprimé dans le manuel.',
  },
  circleExercise: {
    n: 'Entourer la zone',
    ic: 'Circle',
    c: '#a855f7',
    k: 'rect',
    hint: "Dessinez un rectangle sur l'option ou l'élément que l'élève doit entourer.",
  },
  dragDrop: {
    n: 'Glisser-Déposer',
    ic: 'Move',
    c: '#3b82f6',
    k: 'rect',
    hint: "Dessinez un rectangle pour définir un élément à glisser ou une zone cible.",
  },
};

export interface InteractiveItem {
  id: string;
  type: InteractiveToolKey;
  x: number;
  y: number;
  w: number;
  h: number;
  pts?: [number, number][];
  color?: string;
  note?: string;
  text?: string;
  lang?: string;
  rate?: number;
  read?: boolean;
  label?: string;
  fileName?: string;
  fileUrl?: string;
  autoplay?: boolean;
  title?: string;
  url?: string;
  level?: number;
  answer?: string;
  hint?: string;
  cs?: boolean;
  content?: string;
  correct?: boolean;
  // Free Coloring & Contour properties
  fillTolerance?: number;
  autoDetectContours?: boolean;
  outerContourSvg?: string;
  outerPolygonPoints?: [number, number][];
  silhouetteMaskDataUrl?: string;
  regions?: ColoringRegion[];
  cropImageDataUrl?: string;
  lineThreshold?: number;
  smoothing?: number;
  minRegionPixels?: number;
  // Color the Correct Drawings properties
  drawingId?: string;
  isCorrect?: boolean;
  // Paint Bucket legacy properties
  regionId?: string;
  defaultColor?: string;
  targetColor?: string;
  // Arrow Exercise properties
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  tolerance?: number;
  bidirectional?: boolean;
  exerciseId?: string;
  // Interactive Choice Zones properties
  questionId?: string;
  selectionMode?: 'single' | 'multiple';
  // Drag and Drop Exercise properties
  dragDropMode?: 'drag' | 'drop';
  dragId?: string;
  dropId?: string;
  targetDragId?: string;
  dragImageDataUrl?: string;
  maskColor?: string;
  maskPadding?: number;
  isTransparentBg?: boolean;
}

export type PageKind = 'pdf' | 'blank' | 'image' | 'demo';

export interface StudioConfigPage {
  id: string;
  kind: PageKind;
  idx?: number;
  name?: string;
  num?: number;
  doc?: any; // PDFDocumentProxy
  imageUrl?: string;
  imagePath?: string;
  items: InteractiveItem[];
}

export const DEFAULT_ITEM_DATA: Record<InteractiveToolKey, Partial<InteractiveItem>> = {
  select: {},
  highlight: { color: '#facc15', note: '' },
  lasso: { text: '', color: '#a78bfa', read: true, lang: 'fr-FR' },
  tts: { text: '', lang: 'fr-FR', rate: 1 },
  audio: { label: 'Piste audio', autoplay: false },
  video: { title: '', url: '' },
  zoom: { title: 'Zoom HD', level: 2.5 },
  blank: { answer: '', hint: '', cs: false },
  reveal: { content: '', color: '#6366f1' },
  check: { label: '', correct: true },
  button: { label: 'Corriger' },
  freeColoring: {
    label: 'Illustration à colorier',
    color: '#ec4899',
    autoDetectContours: true,
  },
  colorCorrect: {
    label: 'Dessin 1',
    drawingId: 'dessin_1',
    isCorrect: true,
    color: '#8b5cf6',
  },
  paint: { label: 'Zone à colorier', color: '#ec4899', defaultColor: '#ffffff' },
  arrow: {
    label: 'Flèche',
    tolerance: 0.08,
    bidirectional: false,
    exerciseId: 'exo_arrows_1',
    color: '#06b6d4',
  },
  choice: {
    questionId: 'Q1',
    label: 'Option 1',
    selectionMode: 'single',
    isCorrect: true,
    color: '#10b981',
  },
  circleExercise: {
    questionId: 'Q1',
    label: 'Option 1',
    isCorrect: true,
    color: '#a855f7',
  },
  dragDrop: {
    dragDropMode: 'drag',
    dragId: 'drag_1',
    dropId: 'drop_1',
    targetDragId: '',
    maskColor: '#ffffff',
    maskPadding: 2,
    color: '#3b82f6',
    isTransparentBg: false,
  },
};
