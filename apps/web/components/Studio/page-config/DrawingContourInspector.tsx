'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  RotateCcw,
  Check,
  PaintBucket,
  CheckCircle2,
  Sliders,
  MousePointer2,
  X,
  Layers,
} from 'lucide-react';
import type { StudioConfigPage, InteractiveItem } from './types';
import { getOffscreenPageCanvas } from './pdfLoader';
import { extractDrawingContours, floodFillRegionAt, type ColoringRegion } from './contourExtractor';

interface Props {
  page: StudioConfigPage;
  item: InteractiveItem;
  onUpdateItem: (id: string, updates: Partial<InteractiveItem>) => void;
}

const TEST_COLORS: Array<{ name: string; hex: string; rgba: [number, number, number, number] }> = [
  { name: 'Rose', hex: '#ec4899', rgba: [236, 72, 153, 200] },
  { name: 'Violet', hex: '#8b5cf6', rgba: [139, 92, 246, 200] },
  { name: 'Bleu', hex: '#3b82f6', rgba: [59, 130, 246, 200] },
  { name: 'Vert', hex: '#22c55e', rgba: [34, 197, 94, 200] },
  { name: 'Jaune', hex: '#eab308', rgba: [234, 179, 8, 200] },
  { name: 'Orange', hex: '#f97316', rgba: [249, 115, 22, 200] },
  { name: 'Rouge', hex: '#ef4444', rgba: [239, 68, 68, 200] },
  { name: 'Marron', hex: '#78350f', rgba: [120, 53, 15, 200] },
  { name: 'Noir', hex: '#0f172a', rgba: [15, 23, 42, 200] },
];

export default function DrawingContourInspector({
  page,
  item,
  onUpdateItem,
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [localThreshold, setLocalThreshold] = useState<number>(item.lineThreshold ?? 135);
  const [localSmoothing, setLocalSmoothing] = useState<number>(item.smoothing ?? 2.0);
  const [localMinArea, setLocalMinArea] = useState<number>(item.minRegionPixels ?? 25);
  const [activeTestColor, setActiveTestColor] = useState(TEST_COLORS[0]);
  const [testFillsCount, setTestFillsCount] = useState<number>(0);
  const [isTestModeActive, setIsTestModeActive] = useState<boolean>(true);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fillCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropOffscreenRef = useRef<HTMLCanvasElement | null>(null);

  // Extract high-resolution crop and contours
  const runExtraction = useCallback(
    async (threshold = localThreshold, smoothing = localSmoothing, minArea = localMinArea) => {
      setIsProcessing(true);
      try {
        const pageCanvas = await getOffscreenPageCanvas(page, 1600);
        const result = extractDrawingContours(
          pageCanvas,
          { x: item.x, y: item.y, w: item.w, h: item.h },
          {
            threshold,
            smoothing,
            minRegionPixels: minArea,
          }
        );

        // Store offscreen crop canvas for instant pixel flood-fill testing
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = result.cropWidth;
        cropCanvas.height = result.cropHeight;
        const cropCtx = cropCanvas.getContext('2d');
        if (cropCtx && result.cropImageDataUrl) {
          const img = new Image();
          img.onload = () => {
            cropCtx.drawImage(img, 0, 0);
            renderPreviewToCanvas(cropCanvas);
          };
          img.src = result.cropImageDataUrl;
        }
        cropOffscreenRef.current = cropCanvas;

        onUpdateItem(item.id, {
          outerPolygonPoints: result.outerPolygonPoints,
          outerContourSvg: result.outerContourSvg,
          silhouetteMaskDataUrl: result.silhouetteMaskDataUrl,
          regions: result.regions,
          cropImageDataUrl: result.cropImageDataUrl,
          lineThreshold: threshold,
          smoothing,
          minRegionPixels: minArea,
        });
      } catch (err) {
        console.error('Erreur lors de l’extraction des contours:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [page, item.id, item.x, item.y, item.w, item.h, localThreshold, localSmoothing, localMinArea, onUpdateItem]
  );

  // Initial load
  useEffect(() => {
    if (!item.silhouetteMaskDataUrl || !item.cropImageDataUrl) {
      runExtraction();
    } else if (item.cropImageDataUrl && !cropOffscreenRef.current) {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          cropOffscreenRef.current = c;
          renderPreviewToCanvas(c);
        }
      };
      img.src = item.cropImageDataUrl;
    }
  }, [item.id, item.silhouetteMaskDataUrl, item.cropImageDataUrl, runExtraction]);

  // Render crop image onto visual preview canvas
  const renderPreviewToCanvas = (sourceCrop: HTMLCanvasElement) => {
    const preview = previewCanvasRef.current;
    const fillCanvas = fillCanvasRef.current;
    if (!preview || !fillCanvas) return;

    preview.width = sourceCrop.width;
    preview.height = sourceCrop.height;
    fillCanvas.width = sourceCrop.width;
    fillCanvas.height = sourceCrop.height;

    const ctx = preview.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, preview.width, preview.height);
      ctx.drawImage(sourceCrop, 0, 0);
    }
  };

  // Handle paint bucket test clicks directly inside the crop preview
  const handlePreviewCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isTestModeActive) return;

    const fillCanvas = fillCanvasRef.current;
    const cropCanvas = cropOffscreenRef.current;
    if (!fillCanvas || !cropCanvas || cropCanvas.width === 0 || cropCanvas.height === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const normX = Math.max(0, Math.min(1, clickX / rect.width));
    const normY = Math.max(0, Math.min(1, clickY / rect.height));

    const fCtx = fillCanvas.getContext('2d');
    if (!fCtx) return;

    if (item.type === 'colorCorrect') {
      // Color the Correct Drawings: Fill the entire drawing silhouette respecting outer contour
      if (item.silhouetteMaskDataUrl) {
        const maskImg = new Image();
        maskImg.onload = () => {
          fCtx.clearRect(0, 0, fillCanvas.width, fillCanvas.height);
          fCtx.save();
          // Draw mask as destination
          fCtx.drawImage(maskImg, 0, 0, fillCanvas.width, fillCanvas.height);
          // Composite the color over the mask
          fCtx.globalCompositeOperation = 'source-in';
          fCtx.fillStyle = activeTestColor.hex;
          fCtx.fillRect(0, 0, fillCanvas.width, fillCanvas.height);
          fCtx.restore();
          setTestFillsCount((prev) => prev + 1);
        };
        maskImg.src = item.silhouetteMaskDataUrl;
      }
    } else {
      // Free Coloring: Contour-aware pixel flood fill strictly inside the clicked region
      const result = floodFillRegionAt(
        cropCanvas,
        normX,
        normY,
        activeTestColor.rgba,
        localThreshold
      );

      if (result && result.pixelCount > 0) {
        fCtx.drawImage(result.fillCanvas, 0, 0);
        setTestFillsCount((prev) => prev + 1);
      }
    }
  };

  const handleClearTestFills = () => {
    const fillCanvas = fillCanvasRef.current;
    if (fillCanvas) {
      const ctx = fillCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, fillCanvas.width, fillCanvas.height);
    }
    setTestFillsCount(0);
  };

  const regionsCount = item.regions?.length || 0;

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-4 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>Inspecteur de Contours HD</span>
              {isProcessing && <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />}
            </h4>
            <p className="text-[11px] text-slate-400">
              {item.type === 'colorCorrect'
                ? 'Masque précis du contour extérieur'
                : `${regionsCount} zone(s) fermée(s) segmentée(s)`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => runExtraction()}
          disabled={isProcessing}
          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-1.5 transition shadow"
          title="Recalculer les contours"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>Recalculer</span>
        </button>
      </div>

      {/* Visual Crop & Contour Preview Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span className="font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Aperçu HD du dessin sélectionné
          </span>
          <span className="text-[10px] text-slate-400">
            {item.type === 'colorCorrect' ? 'Silhouette exacte' : 'Zones fermées étanches'}
          </span>
        </div>

        {/* Interactive Drawing Box with Pixel Fill Layer */}
        <div
          onClick={handlePreviewCanvasClick}
          className={`relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center p-1 min-h-[190px] max-h-[260px] select-none ${
            isTestModeActive ? 'cursor-cell ring-1 ring-pink-500/40 hover:ring-pink-500/80' : 'cursor-default'
          }`}
          title={isTestModeActive ? 'Cliquez sur une partie du dessin pour tester le pot de peinture' : ''}
        >
          {item.cropImageDataUrl ? (
            <div className="relative w-full h-full max-h-[240px] flex items-center justify-center">
              {/* Source crop background canvas */}
              <canvas
                ref={previewCanvasRef}
                className="max-h-[240px] max-w-full object-contain pointer-events-none"
              />

              {/* Real-time paint fill canvas */}
              <canvas
                ref={fillCanvasRef}
                className="absolute inset-0 max-h-[240px] max-w-full object-contain pointer-events-none"
                style={{ mixBlendMode: 'multiply' }}
              />

              {/* Outer contour SVG stroke overlay */}
              {item.outerContourSvg && (
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <path
                    d={item.outerContourSvg}
                    fill="none"
                    stroke={item.isCorrect !== false ? '#22c55e' : '#ef4444'}
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                    opacity={0.65}
                  />
                </svg>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Extraction du dessin en haute résolution...</span>
            </div>
          )}
        </div>

        {/* Status badges */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {item.type === 'colorCorrect'
                ? 'Contour extérieur précis généré'
                : `${regionsCount} zones fermées colorables sans fuite`}
            </span>
          </div>

          {testFillsCount > 0 && (
            <button
              type="button"
              onClick={handleClearTestFills}
              className="text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Effacer test</span>
            </button>
          )}
        </div>
      </div>

      {/* “Tester le pot de peinture directement ici” interactive toolbar */}
      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
            <PaintBucket className="w-4 h-4 text-pink-400" />
            Tester le pot de peinture directement ici :
          </span>

          <button
            type="button"
            onClick={() => setIsTestModeActive(!isTestModeActive)}
            className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition ${
              isTestModeActive
                ? 'bg-pink-600/30 border-pink-500 text-pink-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {isTestModeActive ? '● Mode Test Actif' : 'Activer'}
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-tight">
          {item.type === 'colorCorrect'
            ? 'Cliquez dans le dessin pour colorier l’intérieur selon son contour exact sans déborder.'
            : 'Cliquez sur une partie fermée du dessin (ex: visage, robe, nageoire) pour la colorier individuellement.'}
        </p>

        {/* Swatches palette */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {TEST_COLORS.map((col) => {
            const isCur = activeTestColor.hex === col.hex;
            return (
              <button
                key={col.hex}
                type="button"
                onClick={() => setActiveTestColor(col)}
                className={`w-6 h-6 rounded-full border transition flex items-center justify-center ${
                  isCur
                    ? 'scale-115 border-white ring-2 ring-pink-400 shadow-md'
                    : 'border-slate-700 hover:scale-105'
                }`}
                style={{ backgroundColor: col.hex }}
                title={`Couleur : ${col.name}`}
              >
                {isCur && <Check className="w-3 h-3 text-white drop-shadow" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fine-Tuning Controls */}
      <div className="space-y-3 pt-1 border-t border-slate-800 text-xs">
        {/* Threshold slider */}
        <div>
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="font-medium">Seuil de détection des traits</span>
            <span className="font-mono text-indigo-400 text-[11px]">{localThreshold}</span>
          </div>
          <input
            type="range"
            min="60"
            max="210"
            step="5"
            value={localThreshold}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setLocalThreshold(val);
              runExtraction(val, localSmoothing, localMinArea);
            }}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Traits très sombres</span>
            <span>Traits fins / clairs</span>
          </div>
        </div>

        {/* Min Area slider for free coloring */}
        {item.type === 'freeColoring' && (
          <div>
            <div className="flex items-center justify-between text-slate-300 mb-1">
              <span className="font-medium">Filtrer les micro-zones (bruit)</span>
              <span className="font-mono text-indigo-400 text-[11px]">{localMinArea} px</span>
            </div>
            <input
              type="range"
              min="10"
              max="150"
              step="5"
              value={localMinArea}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setLocalMinArea(val);
                runExtraction(localThreshold, localSmoothing, val);
              }}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}
