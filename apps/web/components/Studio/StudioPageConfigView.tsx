'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Save,
  FolderOpenDot,
  ArrowRight,
  ArrowLeft,
  Highlighter,
  Lasso,
  Volume2,
  Music,
  Video,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  TextCursorInput,
  Eye,
  CheckSquare,
  CheckCircle2,
  Loader2,
  PaintBucket,
  Palette,
  ArrowUpRight,
  CheckCircle,
  Circle,
  TextSelect,
  Copy,
  Check,
  X,
  Move,
} from 'lucide-react';
import PageSidebar from './page-config/PageSidebar';
import PagePropertiesSidebar from './page-config/PagePropertiesSidebar';
import LivePreviewModal from './page-config/LivePreviewModal';
import {
  TOOL_DEFS,
  DEFAULT_ITEM_DATA,
  type InteractiveToolKey,
  type InteractiveItem,
  type StudioConfigPage,
} from './page-config/types';
import {
  renderPageToCanvas,
  loadPdfDocument,
  extractTextFromPageRect,
  extractAllTextFromPage,
  getOffscreenPageCanvas,
} from './page-config/pdfLoader';
import { extractDrawingContours } from './page-config/contourExtractor';

interface Props {
  initialPdfFile?: File | null;
  initialProjectJsonFile?: File | null;
  initialJobId?: string | null;
  initialPages?: { pageNumber: number; imagePath: string; thumbPath: string }[];
  persistedPages?: StudioConfigPage[];
  onProceedToConversion: (projectData: {
    pages: StudioConfigPage[];
    meta: { title?: string };
  }) => void;
  onBackToUpload?: (currentPages?: StudioConfigPage[]) => void;
}

let uidCounter = 1;
const genId = () => `item_${Date.now()}_${uidCounter++}`;

const TOOL_ICONS: Record<InteractiveToolKey, React.ComponentType<{ className?: string }>> = {
  select: TextSelect,
  highlight: Highlighter,
  lasso: Lasso,
  tts: Volume2,
  audio: Music,
  video: Video,
  zoom: ZoomIn,
  blank: TextCursorInput,
  reveal: Eye,
  check: CheckSquare,
  button: CheckCircle2,
  freeColoring: Palette,
  colorCorrect: PaintBucket,
  paint: PaintBucket,
  arrow: ArrowUpRight,
  choice: CheckCircle,
  circleExercise: Circle,
  dragDrop: Move,
};

export default function StudioPageConfigView({
  initialPdfFile,
  initialProjectJsonFile,
  initialJobId,
  initialPages,
  persistedPages,
  onProceedToConversion,
  onBackToUpload,
}: Props) {
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(() => {
    if (persistedPages && persistedPages.length > 0) return false;
    return !!initialPdfFile;
  });

  // Initialize pages without any fake placeholder demo pages
  const [pages, setPages] = useState<StudioConfigPage[]>(() => {
    if (persistedPages && persistedPages.length > 0) {
      return persistedPages;
    }
    if (initialPages && initialPages.length > 0 && initialJobId) {
      const base = `${process.env.NEXT_PUBLIC_CONVERTER_URL ?? 'http://127.0.0.1:8000'}/files/${initialJobId}/`;
      return initialPages.map((p, i) => ({
        id: `p_${i + 1}`,
        kind: 'image',
        num: p.pageNumber,
        imageUrl: `${base}${p.imagePath}`,
        items: [],
      }));
    }
    // If a PDF is provided, we start empty until loadPdfDocument loads the real pages
    if (initialPdfFile) {
      return [];
    }
    // Fallback if no PDF was provided: exactly 1 blank page
    return [
      {
        id: 'p_blank_1',
        kind: 'blank',
        items: [],
      },
    ];
  });

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [activeTool, setActiveTool] = useState<InteractiveToolKey | null>('highlight');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLiveOpen, setIsLiveOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(3 / 4);
  const [zoom, setZoom] = useState<number>(1);

  // Drawing state
  const [draftRect, setDraftRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [draftLasso, setDraftLasso] = useState<[number, number][] | null>(null);
  const [draftArrow, setDraftArrow] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  // Selected Text state for "Sélectionner" tool
  const [selectedTextInfo, setSelectedTextInfo] = useState<{
    text: string;
    rect: { x: number; y: number; w: number; h: number };
    copied: boolean;
  } | null>(null);
  const [hasCopiedText, setHasCopiedText] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const currentDocRef = useRef<any>(null);
  const activeDocsRef = useRef<Record<string, any>>({});
  const dragRef = useRef<{
    start: [number, number];
    current: [number, number];
    pts: [number, number][];
  } | null>(null);

  const currentPage = pages[currentPageIndex] || pages[0];

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Load initial PDF file into real pages
  useEffect(() => {
    if (!initialPdfFile) return;

    if (persistedPages && persistedPages.length > 0) {
      loadPdfDocument(initialPdfFile)
        .then((doc) => {
          currentDocRef.current = doc;
          if (initialPdfFile.name) {
            activeDocsRef.current[initialPdfFile.name] = doc;
          }
          setPages((prev) =>
            prev.map((p) => (p.kind === 'pdf' && !p.doc ? { ...p, doc } : p))
          );
        })
        .catch(() => { });
      return;
    }

    let cancelled = false;
    setIsLoadingPdf(true);

    loadPdfDocument(initialPdfFile)
      .then((doc) => {
        if (cancelled) return;
        currentDocRef.current = doc;
        if (initialPdfFile.name) {
          activeDocsRef.current[initialPdfFile.name] = doc;
        }

        const newPages: StudioConfigPage[] = [];
        for (let num = 1; num <= doc.numPages; num++) {
          newPages.push({
            id: `p_pdf_${num}`,
            kind: 'pdf',
            name: initialPdfFile.name,
            num,
            doc,
            items: [],
          });
        }
        setPages(newPages);
        setCurrentPageIndex(0);
        setIsLoadingPdf(false);
        showToast(
          `${doc.numPages} page(s) chargée(s) depuis ${initialPdfFile.name}`
        );
      })
      .catch((err) => {
        console.error('Failed to load initial PDF:', err);
        if (!cancelled) {
          setIsLoadingPdf(false);
          showToast('Erreur lors de la lecture du document PDF.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialPdfFile, showToast, persistedPages]);

  // Load initial project JSON file if opened from Step 1
  useEffect(() => {
    if (!initialProjectJsonFile) return;
    initialProjectJsonFile.text().then((text) => {
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data.pages) || data.pages.length === 0) return;
        const activeDoc = currentDocRef.current || pages.find((p) => p.doc)?.doc;
        const pdfName = data.pdfFileName || data.pages[0]?.sourcePdfName;
        const docToUse = (pdfName && activeDocsRef.current[pdfName]) || activeDoc;

        const imported: StudioConfigPage[] = data.pages.map((q: any, i: number) => {
          const pageName = q.sourcePdfName || q.name || pdfName;
          const matchedDoc = (pageName && activeDocsRef.current[pageName]) || docToUse || null;
          return {
            id: `p_loaded_${i + 1}_${Date.now()}`,
            kind: q.kind || (matchedDoc ? 'pdf' : 'blank'),
            idx: q.idx ?? i,
            name: pageName,
            num: q.sourcePdfPageNum || q.num || i + 1,
            doc: matchedDoc,
            items: (q.items || []).map((it: any) => ({
              ...it,
              id: it.id || genId(),
            })),
          };
        });

        setPages(imported);
        setCurrentPageIndex(0);
        setSelectedItemId(null);
        showToast(`Projet chargé avec succès : ${imported.length} pages restaurées.`);
      } catch (err) {
        console.error(err);
      }
    });
  }, [initialProjectJsonFile, showToast]);

  // Render current page onto main canvas ONLY when the page itself changes,
  // NOT when items, drawings, or selection changes!
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || !currentPage) return;

    renderPageToCanvas(currentPage, canvas, 1600).then(() => {
      if (cancelled) return;
      if (canvas.width > 0 && canvas.height > 0) {
        setAspectRatio(canvas.width / canvas.height);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentPage?.id, currentPage?.num, currentPage?.kind, currentPage?.doc, currentPage?.imageUrl]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowRight') {
        setCurrentPageIndex((prev) => Math.min(prev + 1, pages.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPageIndex((prev) => Math.max(prev - 1, 0));
      } else if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedItemId
      ) {
        setPages((prev) =>
          prev.map((p, i) =>
            i === currentPageIndex
              ? { ...p, items: p.items.filter((it) => it.id !== selectedItemId) }
              : p
          )
        );
        setSelectedItemId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages.length, currentPageIndex, selectedItemId]);

  // Automatically close text selection options bar when switching tools or changing pages
  useEffect(() => {
    if (activeTool !== 'select') {
      setSelectedTextInfo(null);
    }
  }, [activeTool, currentPageIndex]);

  // Pointer position relative to overlay (0 to 1)
  const getRelativePos = (e: React.PointerEvent<HTMLDivElement>): [number, number] => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return [0, 0];
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return [x, y];
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.setPointerCapture(e.pointerId);

    // Dismiss existing text selection on new canvas interaction
    if (selectedTextInfo) {
      setSelectedTextInfo(null);
    }

    const pos = getRelativePos(e);
    dragRef.current = { start: pos, current: pos, pts: [pos] };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const pos = getRelativePos(e);
    dragRef.current.current = pos;
    dragRef.current.pts.push(pos);

    if (!activeTool) return;
    const def = TOOL_DEFS[activeTool];

    if (def.k === 'rect') {
      const x = Math.min(dragRef.current.start[0], pos[0]);
      const y = Math.min(dragRef.current.start[1], pos[1]);
      const w = Math.abs(pos[0] - dragRef.current.start[0]);
      const h = Math.abs(pos[1] - dragRef.current.start[1]);
      setDraftRect({ x, y, w, h });
    } else if (def.k === 'lasso') {
      setDraftLasso([...dragRef.current.pts]);
    } else if (def.k === 'arrow') {
      setDraftArrow({
        x1: dragRef.current.start[0],
        y1: dragRef.current.start[1],
        x2: pos[0],
        y2: pos[1],
      });
    }
  };

  const handlePointerUp = () => {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    dragRef.current = null;
    setDraftRect(null);
    setDraftLasso(null);
    setDraftArrow(null);

    const distance = Math.hypot(
      drag.current[0] - drag.start[0],
      drag.current[1] - drag.start[1]
    );
    const isClick = distance < 0.015;

    // Click without active tool: select clicked item (support lines & boxes)
    if (!activeTool || (isClick && TOOL_DEFS[activeTool].k !== 'pt')) {
      // Check arrow items first
      const clickedArrow = currentPage?.items?.find((it) => {
        if (it.type !== 'arrow' || it.startX === undefined || it.endX === undefined) return false;
        const x0 = drag.start[0], y0 = drag.start[1];
        const x1 = it.startX, y1 = it.startY!;
        const x2 = it.endX, y2 = it.endY!;
        const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        if (l2 === 0) return Math.hypot(x0 - x1, y0 - y1) < 0.05;
        const t = Math.max(0, Math.min(1, ((x0 - x1) * (x2 - x1) + (y0 - y1) * (y2 - y1)) / l2));
        const dist = Math.hypot(x0 - (x1 + t * (x2 - x1)), y0 - (y1 + t * (y2 - y1)));
        return dist < 0.04;
      });
      if (clickedArrow) {
        setSelectedItemId(clickedArrow.id);
        return;
      }

      const clicked = [...(currentPage?.items || [])]
        .reverse()
        .find(
          (it) =>
            drag.start[0] >= it.x &&
            drag.start[0] <= it.x + it.w &&
            drag.start[1] >= it.y &&
            drag.start[1] <= it.y + it.h
        );
      setSelectedItemId(clicked ? clicked.id : null);
      return;
    }

    if (activeTool === 'select') {
      const x = Math.min(drag.start[0], drag.current[0]);
      const y = Math.min(drag.start[1], drag.current[1]);
      const w = Math.abs(drag.current[0] - drag.start[0]);
      const h = Math.abs(drag.current[1] - drag.start[1]);

      const searchRect =
        w < 0.01 && h < 0.01
          ? { x: Math.max(0, x - 0.08), y: Math.max(0, y - 0.03), w: 0.16, h: 0.06 }
          : { x, y, w: Math.max(0.01, w), h: Math.max(0.01, h) };

      if (currentPage) {
        extractTextFromPageRect(currentPage, searchRect).then((extracted) => {
          if (extracted && extracted.trim()) {
            const clean = extracted.trim();
            navigator.clipboard.writeText(clean).catch(() => { });
            setSelectedTextInfo({
              text: clean,
              rect: searchRect,
              copied: true,
            });
            showToast(`Texte copié ! (${clean.length} car.)`);
          } else {
            showToast('Aucun texte vectoriel détecté dans cette zone.');
          }
        });
      }
      return;
    }

    const def = TOOL_DEFS[activeTool];
    const newItem: InteractiveItem = {
      id: genId(),
      type: activeTool,
      x: 0,
      y: 0,
      w: 0.1,
      h: 0.1,
      ...structuredClone(DEFAULT_ITEM_DATA[activeTool]),
    };

    if (def.k === 'pt') {
      const w = def.w || 0.08;
      const h = def.h || 0.05;
      newItem.w = w;
      newItem.h = h;
      newItem.x = Math.min(1 - w, Math.max(0, drag.start[0] - w / 2));
      newItem.y = Math.min(1 - h, Math.max(0, drag.start[1] - h / 2));
    } else if (def.k === 'rect') {
      newItem.x = Math.min(drag.start[0], drag.current[0]);
      newItem.y = Math.min(drag.start[1], drag.current[1]);
      newItem.w = Math.abs(drag.current[0] - drag.start[0]);
      newItem.h = Math.abs(drag.current[1] - drag.start[1]);
      if (newItem.w < 0.01 || newItem.h < 0.008) return;

      if (activeTool === 'choice') {
        const existingChoices = currentPage?.items?.filter((it) => it.type === 'choice') || [];
        const lastChoice = existingChoices[existingChoices.length - 1];
        const currentQ = lastChoice?.questionId || 'Q1';
        const choicesInCurrentQ = existingChoices.filter((it) => (it.questionId || 'Q1') === currentQ);
        const count = choicesInCurrentQ.length + 1;
        const hasCorrectInQ = choicesInCurrentQ.some((it) => it.isCorrect);

        newItem.questionId = currentQ;
        newItem.label = `Option ${count}`;
        newItem.selectionMode = 'single';
        newItem.isCorrect = !hasCorrectInQ;
      } else if (activeTool === 'circleExercise') {
        const existingCircles = currentPage?.items?.filter((it) => it.type === 'circleExercise') || [];
        const lastCircle = existingCircles[existingCircles.length - 1];
        const currentQ = lastCircle?.questionId || 'Q1';
        const circlesInCurrentQ = existingCircles.filter((it) => (it.questionId || 'Q1') === currentQ);
        const count = circlesInCurrentQ.length + 1;
        const hasCorrectInQ = circlesInCurrentQ.some((it) => it.isCorrect);

        newItem.questionId = currentQ;
        newItem.label = `Option ${count}`;
        newItem.isCorrect = !hasCorrectInQ;
        newItem.color = '#a855f7';
      } else if (activeTool === 'dragDrop') {
        const existingDragDrop = currentPage?.items?.filter((it) => it.type === 'dragDrop') || [];
        const dragCount = existingDragDrop.filter((it) => it.dragDropMode === 'drag' || !it.dragDropMode).length + 1;
        const dropCount = existingDragDrop.filter((it) => it.dragDropMode === 'drop').length + 1;

        newItem.dragDropMode = 'drag';
        newItem.dragId = `drag_${dragCount}`;
        newItem.dropId = `drop_${dropCount}`;
        newItem.targetDragId = '';
        newItem.maskColor = '#ffffff';
        newItem.maskPadding = 2;
        newItem.color = '#3b82f6';
      } else if (activeTool === 'freeColoring') {
        const count = (currentPage?.items?.filter((it) => it.type === 'freeColoring').length || 0) + 1;
        newItem.label = `Illustration ${count}`;
        newItem.autoDetectContours = true;
      } else if (activeTool === 'colorCorrect') {
        const count = (currentPage?.items?.filter((it) => it.type === 'colorCorrect').length || 0) + 1;
        newItem.drawingId = `dessin_${count}`;
        newItem.label = `Dessin ${count}`;
        newItem.isCorrect = true;
      }
    } else if (def.k === 'lasso') {
      if (drag.pts.length < 5) return;
      const xs = drag.pts.map((p) => p[0]);
      const ys = drag.pts.map((p) => p[1]);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const w = Math.max(0.01, Math.max(...xs) - minX);
      const h = Math.max(0.01, Math.max(...ys) - minY);
      newItem.x = minX;
      newItem.y = minY;
      newItem.w = w;
      newItem.h = h;
      newItem.pts = drag.pts
        .filter((_, idx) => idx % 2 === 0)
        .map((p) => [
          parseFloat((((p[0] - minX) / w) * 100).toFixed(1)),
          parseFloat((((p[1] - minY) / h) * 100).toFixed(1)),
        ]);

      if (activeTool === 'paint') {
        const count = (currentPage?.items?.filter((it) => it.type === 'paint').length || 0) + 1;
        newItem.regionId = `region_${count}`;
        newItem.label = `Région ${count}`;
        newItem.defaultColor = '#ffffff';
      }
    } else if (def.k === 'arrow') {
      const x1 = drag.start[0];
      const y1 = drag.start[1];
      const x2 = drag.current[0];
      const y2 = drag.current[1];
      if (Math.hypot(x2 - x1, y2 - y1) < 0.02) return;
      newItem.x = Math.min(x1, x2);
      newItem.y = Math.min(y1, y2);
      newItem.w = Math.max(0.02, Math.abs(x2 - x1));
      newItem.h = Math.max(0.02, Math.abs(y2 - y1));
      newItem.startX = x1;
      newItem.startY = y1;
      newItem.endX = x2;
      newItem.endY = y2;
      newItem.tolerance = 0.06;
      newItem.bidirectional = false;
      newItem.exerciseId = 'exo_arrows_1';
      const count = (currentPage?.items?.filter((it) => it.type === 'arrow').length || 0) + 1;
      newItem.label = `Flèche ${count}`;
    }

    setPages((prev) =>
      prev.map((p, i) =>
        i === currentPageIndex ? { ...p, items: [...p.items, newItem] } : p
      )
    );
    setSelectedItemId(newItem.id);

    // Auto-extract high-resolution contours for drawings
    if (currentPage && (activeTool === 'freeColoring' || activeTool === 'colorCorrect')) {
      const targetItemId = newItem.id;
      const targetRect = { x: newItem.x, y: newItem.y, w: newItem.w, h: newItem.h };
      getOffscreenPageCanvas(currentPage, 1600)
        .then((canvas) => {
          const result = extractDrawingContours(canvas, targetRect);
          setPages((prev) =>
            prev.map((p, i) =>
              i === currentPageIndex
                ? {
                  ...p,
                  items: p.items.map((it) =>
                    it.id === targetItemId
                      ? {
                        ...it,
                        outerPolygonPoints: result.outerPolygonPoints,
                        outerContourSvg: result.outerContourSvg,
                        silhouetteMaskDataUrl: result.silhouetteMaskDataUrl,
                        regions: result.regions,
                        cropImageDataUrl: result.cropImageDataUrl,
                        lineThreshold: result.lineThreshold,
                        smoothing: result.smoothing,
                      }
                      : it
                  ),
                }
                : p
            )
          );
        })
        .catch((err) => {
          console.warn('Auto contour extraction failed:', err);
        });
    }

    // Auto-extract high-resolution screenshot crop for dragDrop
    if (currentPage && activeTool === 'dragDrop') {
      const targetItemId = newItem.id;
      const targetRect = { x: newItem.x, y: newItem.y, w: newItem.w, h: newItem.h };
      getOffscreenPageCanvas(currentPage, 1600)
        .then((canvas) => {
          const sx = Math.max(0, Math.floor(targetRect.x * canvas.width));
          const sy = Math.max(0, Math.floor(targetRect.y * canvas.height));
          const sw = Math.min(canvas.width - sx, Math.max(1, Math.floor(targetRect.w * canvas.width)));
          const sh = Math.min(canvas.height - sy, Math.max(1, Math.floor(targetRect.h * canvas.height)));

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = sw;
          cropCanvas.height = sh;
          const ctx = cropCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
            const cropDataUrl = cropCanvas.toDataURL('image/png');

            // Sample edge pixels to auto-detect background color
            let detectedColor = '#ffffff';
            try {
              const imgData = ctx.getImageData(0, 0, sw, sh);
              const data = imgData.data;
              const corners = [
                0,
                (sw - 1) * 4,
                ((sh - 1) * sw) * 4,
                ((sh - 1) * sw + (sw - 1)) * 4,
              ];
              let r = 0, g = 0, b = 0;
              corners.forEach((idx) => {
                r += data[idx];
                g += data[idx + 1];
                b += data[idx + 2];
              });
              r = Math.round(r / 4);
              g = Math.round(g / 4);
              b = Math.round(b / 4);
              detectedColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
            } catch (e) { }

            setPages((prev) =>
              prev.map((p, i) =>
                i === currentPageIndex
                  ? {
                    ...p,
                    items: p.items.map((it) =>
                      it.id === targetItemId
                        ? {
                          ...it,
                          dragImageDataUrl: cropDataUrl,
                          maskColor: detectedColor,
                        }
                        : it
                    ),
                  }
                  : p
              )
            );
          }
        })
        .catch((err) => {
          console.warn('Auto drag crop failed:', err);
        });
    }
  };

  const handleUpdateItem = (id: string, updates: Partial<InteractiveItem>) => {
    setPages((prev) =>
      prev.map((p, i) =>
        i === currentPageIndex
          ? {
            ...p,
            items: p.items.map((it) => (it.id === id ? { ...it, ...updates } : it)),
          }
          : p
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    setPages((prev) =>
      prev.map((p, i) =>
        i === currentPageIndex
          ? { ...p, items: p.items.filter((it) => it.id !== id) }
          : p
      )
    );
    if (selectedItemId === id) setSelectedItemId(null);
  };

  // Page manipulations
  const handleDuplicatePage = (idx: number) => {
    const src = pages[idx];
    const duplicated: StudioConfigPage = {
      ...src,
      id: `p_dup_${Date.now()}`,
      items: src.items.map((it) => ({
        ...it,
        id: genId(),
      })),
    };
    const nextPages = [...pages];
    nextPages.splice(idx + 1, 0, duplicated);
    setPages(nextPages);
    setCurrentPageIndex(idx + 1);
    showToast(`Page ${idx + 1} dupliquée.`);
  };

  const handleDeletePage = (idx: number) => {
    if (pages.length <= 1) return;
    const nextPages = pages.filter((_, i) => i !== idx);
    setPages(nextPages);
    setCurrentPageIndex((prev) => Math.min(prev, nextPages.length - 1));
    setSelectedItemId(null);
    showToast(`Page ${idx + 1} supprimée.`);
  };

  const handleAddBlankPage = () => {
    const blank: StudioConfigPage = {
      id: `p_blank_${Date.now()}`,
      kind: 'blank',
      items: [],
    };
    const nextPages = [...pages];
    nextPages.splice(currentPageIndex + 1, 0, blank);
    setPages(nextPages);
    setCurrentPageIndex(currentPageIndex + 1);
    setSelectedItemId(null);
    showToast(`Page blanche ajoutée après la page ${currentPageIndex + 1}.`);
  };

  const handleImportPdfPages = (doc: any, fileName: string) => {
    activeDocsRef.current[fileName] = doc;
    if (!currentDocRef.current) currentDocRef.current = doc;

    const newItems: StudioConfigPage[] = [];
    for (let num = 1; num <= doc.numPages; num++) {
      newItems.push({
        id: `p_imp_${num}_${Date.now()}`,
        kind: 'pdf',
        name: fileName,
        num,
        doc,
        items: [],
      });
    }
    setPages((prev) => [...prev, ...newItems]);
  };

  const handleReorderPages = (fromIdx: number, toIdx: number) => {
    const updated = [...pages];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setPages(updated);
    setCurrentPageIndex(toIdx);
  };

  // Save / Load JSON with complete details of every modification on each page
  const handleSaveJson = () => {
    const exportData = {
      app: 'flipbook-studio-pro',
      version: 1,
      savedAt: new Date().toISOString(),
      pdfFileName: initialPdfFile?.name || pages[0]?.name || 'document.pdf',
      totalPages: pages.length,
      pages: pages.map((p, idx) => ({
        pageNumber: idx + 1,
        kind: p.kind,
        sourcePdfName: p.name,
        sourcePdfPageNum: p.num,
        itemsCount: p.items.length,
        items: p.items.map(({ fileUrl, ...rest }) => ({
          ...rest,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flipbook-projet.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Projet sauvegardé : flipbook-projet.json');
  };

  const handleLoadJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data.pages) || data.pages.length === 0) {
        throw new Error('Structure JSON invalide');
      }

      const activeDoc = currentDocRef.current || pages.find((p) => p.doc)?.doc;
      const pdfName = data.pdfFileName || data.pages[0]?.sourcePdfName;
      let docToUse = (pdfName && activeDocsRef.current[pdfName]) || activeDoc;

      if (!docToUse && initialPdfFile) {
        try {
          docToUse = await loadPdfDocument(initialPdfFile);
          currentDocRef.current = docToUse;
        } catch { }
      }

      const imported: StudioConfigPage[] = data.pages.map(
        (q: any, i: number) => {
          const pageName = q.sourcePdfName || q.name || pdfName;
          const matchedDoc =
            (pageName && activeDocsRef.current[pageName]) || docToUse || null;

          return {
            id: `p_loaded_${i + 1}_${Date.now()}`,
            kind: q.kind || (matchedDoc ? 'pdf' : 'blank'),
            idx: q.idx ?? i,
            name: pageName,
            num: q.sourcePdfPageNum || q.num || i + 1,
            doc: matchedDoc,
            items: (q.items || []).map((it: any) => ({
              ...it,
              id: it.id || genId(),
            })),
          };
        }
      );

      setPages(imported);
      setCurrentPageIndex(0);
      setSelectedItemId(null);
      showToast(
        `Projet chargé avec succès : ${imported.length} pages restaurées.`
      );
    } catch {
      showToast('Fichier .json invalide.');
    }
    e.target.value = '';
  };

  const validateProjectCircleExercises = () => {
    const errors: string[] = [];

    pages.forEach((p, pIdx) => {
      const pageNum = pIdx + 1;
      const circleItems = (p.items || []).filter((it) => it.type === 'circleExercise');
      if (circleItems.length === 0) return;

      const byQ: Record<string, InteractiveItem[]> = {};
      circleItems.forEach((it) => {
        const qId = (it.questionId || '').trim();
        if (!qId) {
          errors.push(`Page ${pageNum} : Une option n'a pas de sous-question assignée.`);
          return;
        }
        byQ[qId] = byQ[qId] || [];
        byQ[qId].push(it);
      });

      Object.entries(byQ).forEach(([qId, opts]) => {
        if (opts.length < 2) {
          errors.push(`Page ${pageNum}, sous-question "${qId}" : doit comporter au moins 2 options (actuellement ${opts.length}).`);
        }
        const correctOpts = opts.filter((o) => o.isCorrect);
        if (correctOpts.length === 0) {
          errors.push(`Page ${pageNum}, sous-question "${qId}" : aucune bonne réponse n'est définie.`);
        } else if (correctOpts.length > 1) {
          errors.push(`Page ${pageNum}, sous-question "${qId}" : ${correctOpts.length} bonnes réponses définies (exactement 1 requise).`);
        }
      });
    });

    return errors;
  };

  const validateProjectDragDrop = () => {
    const errors: string[] = [];

    pages.forEach((p, pIdx) => {
      const pageNum = pIdx + 1;
      const dragDropItems = (p.items || []).filter((it) => it.type === 'dragDrop');
      if (dragDropItems.length === 0) return;

      const dragItems = dragDropItems.filter((it) => it.dragDropMode === 'drag' || !it.dragDropMode);
      const dropItems = dragDropItems.filter((it) => it.dragDropMode === 'drop');

      const dragIds = new Set(dragItems.map((d) => (d.dragId || d.id).trim()));

      dropItems.forEach((target) => {
        const targetRef = (target.targetDragId || '').trim();
        const dropName = target.dropId || 'Cible sans nom';
        if (!targetRef) {
          errors.push(`Page ${pageNum} : La zone cible "${dropName}" n'a aucun élément à glisser associé.`);
        } else if (!dragIds.has(targetRef)) {
          errors.push(`Page ${pageNum} : La zone cible "${dropName}" est associée à "${targetRef}" qui n'existe pas sur cette page.`);
        }
      });
    });

    return errors;
  };

  const handleProceedToConversion = () => {
    const circleErrors = validateProjectCircleExercises();
    if (circleErrors.length > 0) {
      alert(`⚠️ Configuration "Entourer la zone" incomplète :\n\n• ${circleErrors.join('\n• ')}\n\nVeuillez corriger ces points avant de passer à la conversion.`);
      return;
    }

    const dragDropErrors = validateProjectDragDrop();
    if (dragDropErrors.length > 0) {
      alert(`⚠️ Configuration "Glisser-Déposer" incomplète :\n\n• ${dragDropErrors.join('\n• ')}\n\nVeuillez corriger ces points avant de passer à la conversion.`);
      return;
    }

    onProceedToConversion({
      pages,
      meta: { title: initialPdfFile?.name },
    });
  };

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between">
      {/* Ambient glowing background blur orbs */}
      <div className="absolute -top-10 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-10 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-10 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-[1536px] 2xl:max-w-[1720px] mx-auto px-4 py-3 space-y-3 w-full flex-1 flex flex-col justify-between">
        {/* 1. Action & Navigation Menu Bar */}
        <div className="glass-panel rounded-2xl p-3 md:p-3.5 shadow-xl flex flex-wrap items-center gap-3">
          {/* Back to Step 1: Upload */}
          {onBackToUpload && (
            <button
              type="button"
              onClick={() => onBackToUpload(pages)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition active:scale-95 shadow-sm"
              title="Retourner à l'étape 1 (Upload document PDF)"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span>Upload PDF</span>
            </button>
          )}

          {/* Previous / Next Arrow Controls */}
          <div className="flex items-center gap-2 mr-2">
            <button
              type="button"
              onClick={() => setCurrentPageIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentPageIndex === 0 || pages.length === 0}
              aria-label="Page précédente"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 border border-slate-700 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="px-3 text-sm min-w-[96px] text-center font-medium">
              Page <b className="text-white">{pages.length > 0 ? currentPageIndex + 1 : 0}</b>{' '}
              <span className="text-slate-500">/</span>{' '}
              <span className="text-slate-400">{pages.length}</span>
            </div>

            <button
              type="button"
              onClick={() =>
                setCurrentPageIndex((prev) =>
                  Math.min(prev + 1, pages.length - 1)
                )
              }
              disabled={currentPageIndex >= pages.length - 1}
              aria-label="Page suivante"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 border border-slate-700 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Test Page Live Button */}
          <button
            type="button"
            onClick={() => setIsLiveOpen(true)}
            disabled={pages.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs sm:text-sm font-semibold transition active:scale-95 shadow-sm disabled:opacity-50"
          >
            <PlayCircle className="w-4 h-4 text-indigo-400" />
            <span>Tester cette page en direct</span>
          </button>

          {/* Save Project (.json) Button */}
          <button
            type="button"
            onClick={handleSaveJson}
            disabled={pages.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs sm:text-sm font-semibold transition active:scale-95 shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-indigo-400" />
            <span>Sauvegarder projet (.json)</span>
          </button>

          {/* Load Project (.json) Button */}
          <button
            type="button"
            onClick={() => jsonFileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs sm:text-sm font-semibold transition active:scale-95 shadow-sm"
          >
            <FolderOpenDot className="w-4 h-4 text-indigo-400" />
            <span>Charger (.json)</span>
          </button>
          <input
            ref={jsonFileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleLoadJson}
          />

          {/* Next Phase: Proceed to Final Conversion */}
          <button
            type="button"
            onClick={handleProceedToConversion}
            disabled={pages.length === 0}
            className="ml-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold flex items-center gap-2 glow-btn active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <span>Passer à la conversion</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4. Main Glass Canvas & Configuration Section */}
        <main className="glass-panel rounded-3xl p-3 md:p-3.5 shadow-2xl glow-effect flex-1 flex flex-col min-h-0">
          {isLoadingPdf ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4 text-center flex-1">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <h3 className="text-lg font-bold text-white">
                Chargement des pages du PDF...
              </h3>
              <p className="text-sm text-slate-400 max-w-sm">
                Préparation de l'éditeur interactif et rendu haute fidélité des pages.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[290px_minmax(0,1fr)_320px] xl:grid-cols-[330px_minmax(0,1fr)_350px] gap-4 items-stretch flex-1 min-h-0">
                {/* 1. Left Sidebar: Pages · Éléments · Widgets */}
                {currentPage && (
                  <div className="min-w-0 flex flex-col h-full">
                    <PageSidebar
                      pages={pages}
                      currentPageIndex={currentPageIndex}
                      onSelectPage={setCurrentPageIndex}
                      onDuplicatePage={handleDuplicatePage}
                      onDeletePage={handleDeletePage}
                      onAddBlankPage={handleAddBlankPage}
                      onImportPdfPages={handleImportPdfPages}
                      onReorderPages={handleReorderPages}
                      onToast={showToast}
                      page={currentPage}
                      selectedItemId={selectedItemId}
                      onSelectItem={setSelectedItemId}
                      onUpdateItem={handleUpdateItem}
                      onDeleteItem={handleDeleteItem}
                      activeTool={activeTool}
                      onPickTool={(key) => {
                        setSelectedTextInfo(null);
                        setActiveTool((prev) => (prev === key ? null : key));
                      }}
                    />
                  </div>
                )}

                {/* 2. Center Canvas Section */}
                <section className="min-w-0 flex flex-col h-full flex-1 relative">
                  {/* Active Tool Banner (rendered only when a tool is actively selected) */}
                  {activeTool && (
                    <div className="flex items-center justify-between gap-2 px-3 py-1.5 mb-2.5 rounded-xl bg-slate-900/90 border border-indigo-500/40 shadow-sm text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse flex-none" />
                        <p className="text-slate-200 font-medium truncate">
                          <strong className="text-indigo-300">{TOOL_DEFS[activeTool].n} :</strong>{' '}
                          {TOOL_DEFS[activeTool].hint}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-none">
                        {activeTool === 'select' && currentPage && currentPage.kind === 'pdf' && (
                          <button
                            type="button"
                            onClick={async () => {
                              const all = await extractAllTextFromPage(currentPage);
                              if (all && all.trim()) {
                                await navigator.clipboard.writeText(all.trim());
                                showToast(`Tout le texte de la page copié (${all.trim().length} car.) !`);
                              } else {
                                showToast('Aucun texte détecté sur cette page.');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-semibold border border-sky-500/30 transition shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copier tout</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveTool(null)}
                          className="px-2 py-0.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-[11px] font-medium transition"
                        >
                          ✕ Terminer
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Canvas Stage Frame Wrapper */}
                  <div className="relative flex-1 h-full min-h-[700px] lg:h-[calc(100vh-170px)]">
                    {/* Floating Zoom & Scale Controls (Top of Canva) */}
                    <div className="absolute top-3 right-3 z-30 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl shadow-black/60 text-xs">
                      <button
                        type="button"
                        onClick={() => setZoom((prev) => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))}
                        title="Zoom arrière (-10%)"
                        className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setZoom(1)}
                        title="Réinitialiser le zoom (100%)"
                        className="px-2 py-0.5 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 text-[11px] font-semibold tabular-nums transition active:scale-95"
                      >
                        {Math.round(zoom * 100)}%
                      </button>

                      <button
                        type="button"
                        onClick={() => setZoom((prev) => Math.min(2.5, Math.round((prev + 0.1) * 10) / 10))}
                        title="Zoom avant (+10%)"
                        className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

                      <button
                        type="button"
                        onClick={() => setZoom((prev) => (prev > 1.05 ? 1 : 1.3))}
                        title={zoom > 1.05 ? "Ajuster la page (100%)" : "Agrandir (130%)"}
                        className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95 flex items-center gap-1 text-[11px]"
                      >
                        {zoom > 1.05 ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Canvas Stage Frame */}
                    <div className="w-full h-full rounded-2xl bg-slate-900/60 border border-slate-800 p-2 sm:p-3 md:p-3.5 flex overflow-auto custom-scrollbar">
                      <div
                        className="m-auto relative shadow-2xl shadow-black/50 select-none shrink-0 transition-[width] duration-150"
                        style={{
                          width: `calc(max(540px, (100vh - 176px) * ${aspectRatio}) * ${zoom})`,
                          maxWidth: zoom <= 1 ? '100%' : undefined,
                        }}
                      >
                        <canvas
                          id="studio-main-cv"
                          ref={canvasRef}
                          className="block w-full bg-white rounded-lg shadow-xl"
                        />

                        {/* Interactive Drawing Overlay */}
                        <div
                          ref={overlayRef}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          className={[
                            'absolute inset-0',
                            activeTool ? 'cursor-crosshair' : 'cursor-default',
                          ].join(' ')}
                          style={{ touchAction: 'none' }}
                        >
                          {/* Rendered Items on Overlay */}
                          {currentPage?.items?.map((it) => {
                            const def = TOOL_DEFS[it.type];
                            const col = it.color || def?.c || '#6366f1';
                            const isSelected = it.id === selectedItemId;

                            // Special Arrow rendering
                            if (it.type === 'arrow' && it.startX !== undefined && it.endX !== undefined) {
                              const sx = it.startX * 100;
                              const sy = it.startY! * 100;
                              const ex = it.endX * 100;
                              const ey = it.endY! * 100;
                              const tolPct = (it.tolerance || 0.06) * 100;
                              return (
                                <div key={it.id} className="absolute inset-0 pointer-events-none">
                                  <svg className="w-full h-full overflow-visible">
                                    <defs>
                                      <marker
                                        id={`studio-arrow-head-${it.id}`}
                                        markerWidth="6"
                                        markerHeight="6"
                                        refX="5"
                                        refY="2.5"
                                        orient="auto"
                                      >
                                        <path d="M0,0.5 L0,4.5 L5,2.5 z" fill={isSelected ? '#38bdf8' : col} />
                                      </marker>
                                    </defs>
                                    {/* Tolerance radius preview on selection */}
                                    {isSelected && (
                                      <>
                                        <circle
                                          cx={`${sx}%`}
                                          cy={`${sy}%`}
                                          r={`${tolPct}%`}
                                          fill="#06b6d418"
                                          stroke="#06b6d4"
                                          strokeWidth="1.5"
                                          strokeDasharray="3,3"
                                        />
                                        <circle
                                          cx={`${ex}%`}
                                          cy={`${ey}%`}
                                          r={`${tolPct}%`}
                                          fill="#06b6d418"
                                          stroke="#06b6d4"
                                          strokeWidth="1.5"
                                          strokeDasharray="3,3"
                                        />
                                      </>
                                    )}
                                    {/* Directed Arrow Line */}
                                    <line
                                      x1={`${sx}%`}
                                      y1={`${sy}%`}
                                      x2={`${ex}%`}
                                      y2={`${ey}%`}
                                      stroke={isSelected ? '#38bdf8' : col}
                                      strokeWidth={isSelected ? '2' : '1.5'}
                                      markerEnd={`url(#studio-arrow-head-${it.id})`}
                                    />
                                    {/* Start & End Anchor Dots */}
                                    <circle cx={`${sx}%`} cy={`${sy}%`} r="2.5" fill="#22c55e" stroke="#ffffff" strokeWidth="1" />
                                    <circle cx={`${ex}%`} cy={`${ey}%`} r="2.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                                  </svg>
                                  <span
                                    className="absolute font-bold text-[10px] px-1.5 py-0.5 rounded shadow text-white pointer-events-none whitespace-nowrap"
                                    style={{
                                      left: `${(sx + ex) / 2}%`,
                                      top: `${(sy + ey) / 2}%`,
                                      transform: 'translate(-50%, -100%)',
                                      backgroundColor: isSelected ? '#0284c7' : col,
                                    }}
                                  >
                                    {it.label || 'Flèche'} {it.bidirectional ? '↔' : '→'}
                                  </span>
                                </div>
                              );
                            }

                            // Special Choice Zone rendering
                            if (it.type === 'choice') {
                              return (
                                <div
                                  key={it.id}
                                  className="absolute pointer-events-none transition-all"
                                  style={{
                                    left: `${it.x * 100}%`,
                                    top: `${it.y * 100}%`,
                                    width: `${it.w * 100}%`,
                                    height: `${it.h * 100}%`,
                                    backgroundColor: isSelected
                                      ? 'rgba(16, 185, 129, 0.35)'
                                      : it.isCorrect
                                        ? 'rgba(16, 185, 129, 0.2)'
                                        : 'rgba(239, 68, 68, 0.15)',
                                    border: isSelected
                                      ? '2px solid #34d399'
                                      : it.isCorrect
                                        ? '2px dashed #10b981'
                                        : '2px dashed #ef4444',
                                    outline: isSelected ? '2px dashed #ffffff' : undefined,
                                  }}
                                >
                                  <span
                                    className="absolute left-0 -top-4 font-bold text-[10px] px-1.5 py-0.5 rounded text-slate-900 whitespace-nowrap shadow-sm pointer-events-none flex items-center gap-1.5"
                                    style={{ backgroundColor: it.isCorrect ? '#34d399' : '#f87171' }}
                                  >
                                    <span className="bg-slate-900/40 text-white px-1 rounded text-[9px] font-mono">
                                      {it.questionId || 'Q1'}
                                    </span>
                                    <span>{it.label || 'Option'}</span>
                                    <span>{it.isCorrect ? '(✓ Vrai)' : '(✗ Faux)'}</span>
                                  </span>
                                </div>
                              );
                            }

                            // Special Circle Exercise Zone rendering
                            if (it.type === 'circleExercise') {
                              return (
                                <div
                                  key={it.id}
                                  className="absolute pointer-events-none transition-all flex items-center justify-center"
                                  style={{
                                    left: `${it.x * 100}%`,
                                    top: `${it.y * 100}%`,
                                    width: `${it.w * 100}%`,
                                    height: `${it.h * 100}%`,
                                    borderRadius: '9999px',
                                    backgroundColor: isSelected
                                      ? 'rgba(168, 85, 247, 0.28)'
                                      : it.isCorrect
                                        ? 'rgba(16, 185, 129, 0.16)'
                                        : 'rgba(239, 68, 68, 0.14)',
                                    border: isSelected
                                      ? '2.5px solid #a855f7'
                                      : it.isCorrect
                                        ? '2px dashed #10b981'
                                        : '2px dashed #ef4444',
                                    outline: isSelected ? '2px dashed #ffffff' : undefined,
                                  }}
                                >
                                  <span
                                    className="absolute left-1/2 -top-4 -translate-x-1/2 font-bold text-[10px] px-1.5 py-0.5 rounded text-white whitespace-nowrap shadow-sm pointer-events-none flex items-center gap-1.5 z-20"
                                    style={{ backgroundColor: it.isCorrect ? '#10b981' : '#ef4444' }}
                                  >
                                    <span className="bg-slate-900/60 text-purple-200 px-1 rounded text-[9px] font-mono font-bold">
                                      ⭕ {it.questionId || 'Q1'}
                                    </span>
                                    <span>{it.label || 'Option'}</span>
                                    <span>{it.isCorrect ? '(✓ Vrai)' : '(✗ Faux)'}</span>
                                  </span>
                                  <svg className="w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <ellipse
                                      cx="50"
                                      cy="50"
                                      rx="47"
                                      ry="44"
                                      fill="none"
                                      stroke={isSelected ? '#c084fc' : it.isCorrect ? '#34d399' : '#f87171'}
                                      strokeWidth="2"
                                      strokeDasharray="4 3"
                                    />
                                  </svg>
                                </div>
                              );
                            }

                            // Special Drag and Drop Exercise Zone rendering
                            if (it.type === 'dragDrop') {
                              const isDrag = (it.dragDropMode || 'drag') === 'drag';
                              return (
                                <div
                                  key={it.id}
                                  className="absolute pointer-events-none transition-all flex items-center justify-center"
                                  style={{
                                    left: `${it.x * 100}%`,
                                    top: `${it.y * 100}%`,
                                    width: `${it.w * 100}%`,
                                    height: `${it.h * 100}%`,
                                    backgroundColor: isDrag
                                      ? (it.maskColor || '#ffffff')
                                      : 'rgba(6, 182, 212, 0.12)',
                                    border: isSelected
                                      ? (isDrag ? '2.5px solid #3b82f6' : '2.5px solid #06b6d4')
                                      : (isDrag ? '2px solid #3b82f6' : '2px dashed #06b6d4'),
                                    borderRadius: isDrag ? '6px' : '8px',
                                    outline: isSelected ? '2px dashed #ffffff' : undefined,
                                  }}
                                >
                                  {isDrag ? (
                                    <>
                                      {it.dragImageDataUrl && (
                                        <img
                                          src={it.dragImageDataUrl}
                                          alt={it.dragId || 'Élément à glisser'}
                                          className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
                                        />
                                      )}
                                      <span
                                        className="absolute left-1/2 -top-4 -translate-x-1/2 font-bold text-[10px] px-1.5 py-0.5 rounded text-white whitespace-nowrap shadow-sm pointer-events-none flex items-center gap-1.5 z-20 bg-blue-600"
                                      >
                                        <span>✋ {it.dragId || 'drag'}</span>
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex flex-col items-center justify-center text-cyan-400/80">
                                        <span className="text-sm">🎯</span>
                                        <span className="text-[9px] font-mono font-bold mt-0.5">
                                          {it.targetDragId ? `Accepte: ${it.targetDragId}` : 'Cible'}
                                        </span>
                                      </div>
                                      <span
                                        className="absolute left-1/2 -top-4 -translate-x-1/2 font-bold text-[10px] px-1.5 py-0.5 rounded text-white whitespace-nowrap shadow-sm pointer-events-none flex items-center gap-1.5 z-20"
                                        style={{ backgroundColor: it.targetDragId ? '#0891b2' : '#f59e0b' }}
                                      >
                                        <span>🎯 {it.dropId || 'drop'}</span>
                                        <span className="text-[9px] opacity-90 font-mono">
                                          ({it.targetDragId ? `→ ${it.targetDragId}` : 'non associé'})
                                        </span>
                                      </span>
                                    </>
                                  )}
                                </div>
                              );
                            }

                            // Special Color the Correct Drawings rendering
                            if (it.type === 'colorCorrect') {
                              return (
                                <div
                                  key={it.id}
                                  className="absolute pointer-events-none transition-all"
                                  style={{
                                    left: `${it.x * 100}%`,
                                    top: `${it.y * 100}%`,
                                    width: `${it.w * 100}%`,
                                    height: `${it.h * 100}%`,
                                    backgroundColor: isSelected
                                      ? 'rgba(139, 92, 246, 0.35)'
                                      : it.isCorrect
                                        ? 'rgba(34, 197, 94, 0.18)'
                                        : 'rgba(239, 68, 68, 0.18)',
                                    border: isSelected
                                      ? '2px solid #a855f7'
                                      : it.isCorrect
                                        ? '2px dashed #22c55e'
                                        : '2px dashed #ef4444',
                                    outline: isSelected ? '2px dashed #ffffff' : undefined,
                                  }}
                                >
                                  {it.outerContourSvg && (
                                    <svg
                                      viewBox="0 0 100 100"
                                      preserveAspectRatio="none"
                                      className="absolute inset-0 w-full h-full pointer-events-none"
                                    >
                                      <path
                                        d={it.outerContourSvg}
                                        fill="none"
                                        stroke={it.isCorrect ? '#22c55e' : '#ef4444'}
                                        strokeWidth="2"
                                        strokeDasharray="2 2"
                                      />
                                    </svg>
                                  )}
                                  <span
                                    className="absolute left-0 -top-4 font-bold text-[10px] px-1 rounded text-slate-900 whitespace-nowrap shadow-sm pointer-events-none flex items-center gap-1"
                                    style={{ backgroundColor: it.isCorrect ? '#4ade80' : '#f87171' }}
                                  >
                                    <span>[{it.drawingId || 'Dessin'}]</span>
                                    <span>{it.label}</span>
                                    <span>{it.isCorrect ? '(✓ Correct)' : '(✗ Distracteur)'}</span>
                                  </span>
                                </div>
                              );
                            }

                            // Special Free Coloring rendering
                            if (it.type === 'freeColoring') {
                              return (
                                <div
                                  key={it.id}
                                  className="absolute pointer-events-none transition-all"
                                  style={{
                                    left: `${it.x * 100}%`,
                                    top: `${it.y * 100}%`,
                                    width: `${it.w * 100}%`,
                                    height: `${it.h * 100}%`,
                                    backgroundColor: isSelected ? 'rgba(236, 72, 153, 0.25)' : 'rgba(236, 72, 153, 0.08)',
                                    border: isSelected ? '2px solid #ec4899' : '2px dashed #ec4899',
                                    outline: isSelected ? '2px dashed #ffffff' : undefined,
                                  }}
                                >
                                  {it.regions && it.regions.length > 0 && (
                                    <svg
                                      viewBox="0 0 100 100"
                                      preserveAspectRatio="none"
                                      className="absolute inset-0 w-full h-full pointer-events-none"
                                    >
                                      {it.regions.map((reg) => (
                                        <path
                                          key={reg.id}
                                          d={reg.pathD}
                                          fill="rgba(236, 72, 153, 0.12)"
                                          stroke="#ec4899"
                                          strokeWidth="1"
                                        />
                                      ))}
                                    </svg>
                                  )}
                                  <span
                                    className="absolute left-0 -top-4 font-bold text-[10px] px-1.5 py-0.5 rounded text-white bg-pink-600 whitespace-nowrap shadow-sm pointer-events-none flex items-center gap-1"
                                  >
                                    <span>🎨 Coloriage libre : {it.label || 'Illustration'} ({it.regions?.length || 0} zones)</span>
                                  </span>
                                </div>
                              );
                            }

                            // Special Highlight (Surligner) rendering — transparent overlay preserving printed text
                            if (it.type === 'highlight') {
                              return (
                                <div
                                  key={it.id}
                                  className="absolute pointer-events-none transition-all"
                                  style={{
                                    left: `${it.x * 100}%`,
                                    top: `${it.y * 100}%`,
                                    width: `${it.w * 100}%`,
                                    height: `${it.h * 100}%`,
                                    backgroundColor: it.color || '#facc15',
                                    opacity: isSelected ? 0.55 : 0.38,
                                    mixBlendMode: 'multiply',
                                    border: isSelected ? '1.5px solid #ca8a04' : undefined,
                                    outline: isSelected ? '1px dashed #ffffff' : undefined,
                                    borderRadius: '3px',
                                  }}
                                >
                                  <span
                                    className="absolute left-0 -top-4 font-bold text-[10px] px-1 rounded text-slate-900 whitespace-nowrap shadow-sm pointer-events-none"
                                    style={{ backgroundColor: '#facc15' }}
                                  >
                                    Surligner {it.note ? `(${it.note})` : ''}
                                  </span>
                                </div>
                              );
                            }

                            // Special Checkbox (Case à cocher) rendering
                            if (it.type === 'check') {
                              return (
                                <div
                                  key={it.id}
                                  className="absolute pointer-events-none transition-all flex items-center justify-center"
                                  style={{
                                    left: `${it.x * 100}%`,
                                    top: `${it.y * 100}%`,
                                    width: `${it.w * 100}%`,
                                    height: `${it.h * 100}%`,
                                    border: isSelected ? '2px solid #2dd4bf' : '2px dashed #0d9488',
                                    outline: isSelected ? '2px dashed #ffffff' : undefined,
                                    backgroundColor: isSelected ? 'rgba(45, 212, 191, 0.25)' : 'rgba(45, 212, 191, 0.12)',
                                    borderRadius: '4px',
                                  }}
                                >
                                  <span className="font-bold text-teal-600 select-none text-xs">
                                    ✓
                                  </span>
                                  {it.label && (
                                    <span className="absolute left-[105%] whitespace-nowrap text-[10px] font-semibold text-slate-900 bg-white/90 px-1 py-0.5 rounded shadow">
                                      {it.label}
                                    </span>
                                  )}
                                  <span
                                    className="absolute left-0 -top-4 font-bold text-[10px] px-1 rounded text-slate-900 whitespace-nowrap shadow-sm pointer-events-none"
                                    style={{ backgroundColor: '#2dd4bf' }}
                                  >
                                    Case à cocher {it.correct ? '(attendue)' : ''}
                                  </span>
                                </div>
                              );
                            }

                            // Standard/Lasso/Paint items rendering
                            const isPaint = it.type === 'paint';
                            return (
                              <div
                                key={it.id}
                                className="absolute pointer-events-none"
                                style={{
                                  left: `${it.x * 100}%`,
                                  top: `${it.y * 100}%`,
                                  width: `${it.w * 100}%`,
                                  height: `${it.h * 100}%`,
                                }}
                              >
                                <div
                                  className="absolute inset-0 transition-all"
                                  style={{
                                    backgroundColor: `${col}${isSelected ? '88' : '44'}`,
                                    border:
                                      it.type !== 'lasso' && !it.pts
                                        ? `2px solid ${col}`
                                        : undefined,
                                    outline:
                                      isSelected && !it.pts
                                        ? '2px dashed #ffffff'
                                        : undefined,
                                    clipPath:
                                      it.pts
                                        ? `polygon(${it.pts
                                          .map((q) => `${q[0]}% ${q[1]}%`)
                                          .join(',')})`
                                        : undefined,
                                  }}
                                />
                                <span
                                  className="absolute left-0 -top-4 font-bold text-[10px] px-1 rounded text-slate-900 whitespace-nowrap shadow-sm pointer-events-none"
                                  style={{ backgroundColor: col }}
                                >
                                  {isPaint ? `🎨 ${it.label || 'Zone Peinture'}` : def?.n}
                                </span>
                              </div>
                            );
                          })}

                          {/* Rectangle Drag Draft */}
                          {draftRect && activeTool && (
                            <div
                              className="absolute pointer-events-none border-2 border-dashed"
                              style={{
                                left: `${draftRect.x * 100}%`,
                                top: `${draftRect.y * 100}%`,
                                width: `${draftRect.w * 100}%`,
                                height: `${draftRect.h * 100}%`,
                                borderColor: TOOL_DEFS[activeTool].c,
                                backgroundColor: `${TOOL_DEFS[activeTool].c}33`,
                              }}
                            />
                          )}

                          {/* Lasso Drag Draft */}
                          {draftLasso && activeTool && (
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                backgroundColor: `${TOOL_DEFS[activeTool].c}44`,
                                clipPath: `polygon(${draftLasso
                                  .map((q) => `${q[0] * 100}% ${q[1] * 100}%`)
                                  .join(',')})`,
                              }}
                            />
                          )}

                          {/* Arrow Drag Draft */}
                          {draftArrow && activeTool && (
                            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                              <defs>
                                <marker
                                  id="draft-arrow-head"
                                  markerWidth="6"
                                  markerHeight="6"
                                  refX="5"
                                  refY="2.5"
                                  orient="auto"
                                >
                                  <path d="M0,0.5 L0,4.5 L5,2.5 z" fill="#06b6d4" />
                                </marker>
                              </defs>
                              <line
                                x1={`${draftArrow.x1 * 100}%`}
                                y1={`${draftArrow.y1 * 100}%`}
                                x2={`${draftArrow.x2 * 100}%`}
                                y2={`${draftArrow.y2 * 100}%`}
                                stroke="#06b6d4"
                                strokeWidth="1.8"
                                strokeDasharray="4,4"
                                markerEnd="url(#draft-arrow-head)"
                              />
                              <circle cx={`${draftArrow.x1 * 100}%`} cy={`${draftArrow.y1 * 100}%`} r="2.5" fill="#22c55e" stroke="#fff" strokeWidth="1" />
                              <circle cx={`${draftArrow.x2 * 100}%`} cy={`${draftArrow.y2 * 100}%`} r="2.5" fill="#06b6d4" stroke="#fff" strokeWidth="1" />
                            </svg>
                          )}
                        </div>

                        {/* Selected Text Floating Action Badge for "Sélectionner" tool (Rendered OUTSIDE overlayRef to guarantee full clickability) */}
                        {selectedTextInfo && (
                          <div
                            className="absolute inset-0 pointer-events-none z-40 overflow-visible"
                            onPointerDown={(e) => e.stopPropagation()}
                            onPointerUp={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Selection bounding box */}
                            <div
                              className="absolute border-2 border-dashed border-sky-400 bg-sky-400/20 rounded shadow-md pointer-events-none transition-all"
                              style={{
                                left: `${selectedTextInfo.rect.x * 100}%`,
                                top: `${selectedTextInfo.rect.y * 100}%`,
                                width: `${selectedTextInfo.rect.w * 100}%`,
                                height: `${selectedTextInfo.rect.h * 100}%`,
                              }}
                            />

                            {/* Floating Options Bar */}
                            <div
                              className="absolute pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/95 border border-sky-500/60 shadow-2xl backdrop-blur-md text-xs whitespace-nowrap z-50 text-slate-200"
                              style={{
                                left: `${Math.max(1, Math.min(60, selectedTextInfo.rect.x * 100))}%`,
                                ...(selectedTextInfo.rect.y < 0.14
                                  ? { top: `${(selectedTextInfo.rect.y + selectedTextInfo.rect.h) * 100}%`, marginTop: '8px' }
                                  : { bottom: `${(1 - selectedTextInfo.rect.y) * 100}%`, marginBottom: '8px' }),
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              onPointerUp={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                readOnly
                                value={selectedTextInfo.text}
                                className="max-w-[160px] sm:max-w-[240px] px-2 py-1 font-mono text-[11px] text-sky-200 bg-sky-950/70 rounded-lg border border-sky-800/60 select-all cursor-text focus:outline-none"
                                title={selectedTextInfo.text}
                                onFocus={(e) => e.target.select()}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(selectedTextInfo.text).catch(() => { });
                                  setHasCopiedText(true);
                                  showToast('Texte copié dans le presse-papier !');
                                  setTimeout(() => setHasCopiedText(false), 2000);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow transition text-[11px] active:scale-95"
                                title="Copier le texte sélectionné"
                              >
                                {hasCopiedText ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                                    <span className="text-emerald-200 font-bold">Copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copier</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const text = selectedTextInfo.text.trim();
                                  if (!text) return;
                                  const newItem: InteractiveItem = {
                                    id: genId(),
                                    type: 'tts',
                                    x: selectedTextInfo.rect.x,
                                    y: selectedTextInfo.rect.y,
                                    w: Math.max(0.04, selectedTextInfo.rect.w),
                                    h: Math.max(0.03, selectedTextInfo.rect.h),
                                    text,
                                    lang: /[\u0600-\u06FF]/.test(text) ? 'ar-SA' : 'fr-FR',
                                    rate: 1,
                                  };
                                  setPages((prev) =>
                                    prev.map((p, i) =>
                                      i === currentPageIndex ? { ...p, items: [...p.items, newItem] } : p
                                    )
                                  );
                                  setSelectedItemId(newItem.id);
                                  setSelectedTextInfo(null);
                                  showToast('Zone TTS créée avec le texte sélectionné !');
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/50 hover:bg-indigo-600/80 border border-indigo-500/60 text-indigo-100 font-semibold shadow transition text-[11px] active:scale-95"
                                title="Créer une zone TTS à partir de ce texte"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Créer TTS</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const text = selectedTextInfo.text.trim();
                                  const newItem: InteractiveItem = {
                                    id: genId(),
                                    type: 'highlight',
                                    x: selectedTextInfo.rect.x,
                                    y: selectedTextInfo.rect.y,
                                    w: Math.max(0.04, selectedTextInfo.rect.w),
                                    h: Math.max(0.02, selectedTextInfo.rect.h),
                                    color: '#facc15',
                                    note: text.slice(0, 40),
                                  };
                                  setPages((prev) =>
                                    prev.map((p, i) =>
                                      i === currentPageIndex ? { ...p, items: [...p.items, newItem] } : p
                                    )
                                  );
                                  setSelectedItemId(newItem.id);
                                  setSelectedTextInfo(null);
                                  showToast('Surlignage créé sur ce texte !');
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-500/30 hover:bg-yellow-500/50 border border-yellow-500/50 text-yellow-100 font-semibold shadow transition text-[11px] active:scale-95"
                                title="Créer un surlignage sur cette zone"
                              >
                                <Highlighter className="w-3.5 h-3.5" />
                                <span>Surligner</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTextInfo(null);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95"
                                title="Fermer la sélection"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Right Sidebar: Propriétés de l'élément sélectionné */}
                {currentPage && (
                  <div className="min-w-0 flex flex-col h-full">
                    <PagePropertiesSidebar
                      page={currentPage}
                      pageNumber={currentPageIndex + 1}
                      selectedItemId={selectedItemId}
                      onSelectItem={setSelectedItemId}
                      onUpdateItem={handleUpdateItem}
                      onDeleteItem={handleDeleteItem}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center pt-2 text-slate-500 text-xs">
          <p>
            Flipbook Studio Pro Engine v2 • Compilateur Web • Tous
            droits réservés &copy; 2026
          </p>
        </footer>
      </div>

      {/* Live Preview Modal */}
      {isLiveOpen && currentPage && (
        <LivePreviewModal
          page={currentPage}
          pageNumber={currentPageIndex + 1}
          onClose={() => setIsLiveOpen(false)}
          onToast={showToast}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-5 py-3 rounded-xl bg-slate-800 border border-indigo-500/40 text-sm text-white shadow-2xl max-w-[90vw] text-center animate-in fade-in zoom-in duration-200"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
