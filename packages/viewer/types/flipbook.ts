export type InteractionType =
  | 'audio'
  | 'zoom'
  | 'video'
  | 'paint-region'
  | 'arrow-exercise'
  | 'choice-zone'
  | 'circle-zone'
  | 'drag-item'
  | 'drop-target';

export interface BaseInteraction {
  id: string;
  type: InteractionType;
  title?: string;
  x: string;
  y: string;
}

export interface AudioInteraction extends BaseInteraction {
  type: 'audio';
  src: string;
}

export interface ZoomInteraction extends BaseInteraction {
  type: 'zoom';
  width: string;
  height: string;
  hiresSrc: string;
}

export interface VideoInteraction extends BaseInteraction {
  type: 'video';
  youtubeUrl: string;
}

export interface PaintRegionInteraction extends BaseInteraction {
  type: 'paint-region';
  regionId?: string;
  width?: string;
  height?: string;
  pts?: [number, number][];
  defaultColor?: string;
  targetColor?: string;
  label?: string;
}

export interface ArrowExerciseInteraction extends BaseInteraction {
  type: 'arrow-exercise';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  tolerance?: number;
  bidirectional?: boolean;
  exerciseId?: string;
  label?: string;
}

export interface ChoiceZoneInteraction extends BaseInteraction {
  type: 'choice-zone';
  questionId: string;
  selectionMode: 'single' | 'multiple';
  isCorrect: boolean;
  width: string;
  height: string;
  label?: string;
}

export interface CircleZoneInteraction extends BaseInteraction {
  type: 'circle-zone';
  questionId: string;
  isCorrect: boolean;
  width: string;
  height: string;
  label?: string;
}

export interface DragItemInteraction extends BaseInteraction {
  type: 'drag-item';
  dragId: string;
  dragImageDataUrl: string;
  maskColor?: string;
  maskPadding?: number;
  isTransparentBg?: boolean;
  width: string;
  height: string;
}

export interface DropTargetInteraction extends BaseInteraction {
  type: 'drop-target';
  dropId: string;
  targetDragId: string;
  width: string;
  height: string;
  label?: string;
}

export type PageInteraction =
  | AudioInteraction
  | ZoomInteraction
  | VideoInteraction
  | PaintRegionInteraction
  | ArrowExerciseInteraction
  | ChoiceZoneInteraction
  | CircleZoneInteraction
  | DragItemInteraction
  | DropTargetInteraction
  | any;

export interface PageData {
  pageNumber: number;
  imagePath: string;
  thumbPath: string;
  title?: string;
  interactions: PageInteraction[];
}

export interface BookConfig {
  title: string;
  totalPages: number;
  pageAspectRatio: number;
  pages: PageData[];
}

