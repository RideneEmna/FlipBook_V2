'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;
const WHEEL_SENSITIVITY = 0.001;

export const ImageModal: React.FC<ImageModalProps> = ({
  src,
  alt,
  isOpen,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const translateAtDragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Pinch-to-zoom touch refs
  const initialPinchDistance = useRef<number | null>(null);
  const zoomAtPinchStart = useRef(1);

  // ─── Open / Close animation ────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setIsAnimatingOut(false);
      setIsVisible(true);
      // Reset view whenever a new image is opened
      setZoom(1);
      setTranslate({ x: 0, y: 0 });
      // Move focus to close button for accessibility
      setTimeout(() => closeButtonRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimatingOut(false);
      onClose();
    }, 100);
  }, [onClose]);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.stopPropagation();
          handleClose();
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom((z) => Math.min(MAX_ZOOM, parseFloat((z + ZOOM_STEP).toFixed(2))));
          break;
        case '-':
          e.preventDefault();
          setZoom((z) => Math.max(MIN_ZOOM, parseFloat((z - ZOOM_STEP).toFixed(2))));
          break;
        case '0':
          setZoom(1);
          setTranslate({ x: 0, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, handleClose]);

  // ─── Mouse wheel zoom ──────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = -e.deltaY * WHEEL_SENSITIVITY;
    setZoom((z) => {
      const next = z + delta * z; // proportional zoom
      return parseFloat(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)).toFixed(3));
    });
  }, []);

  // ─── Mouse drag (pan) ──────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      translateAtDragStart.current = { ...translate };
    },
    [zoom, translate]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setTranslate({
        x: translateAtDragStart.current.x + dx,
        y: translateAtDragStart.current.y + dy,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // ─── Double-click zoom in / reset ──────────────────────────────────────────
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (zoom > 1) {
        setZoom(1);
        setTranslate({ x: 0, y: 0 });
      } else {
        setZoom(2.2);
      }
    },
    [zoom]
  );

  // ─── Touch pinch-to-zoom ───────────────────────────────────────────────────
  const getPinchDistance = (touches: React.TouchList) => {
    const [t1, t2] = [touches[0], touches[1]];
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      initialPinchDistance.current = getPinchDistance(e.touches);
      zoomAtPinchStart.current = zoom;
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance.current !== null) {
      e.preventDefault();
      const currentDistance = getPinchDistance(e.touches);
      const scale = currentDistance / initialPinchDistance.current;
      const newZoom = parseFloat(
        Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomAtPinchStart.current * scale)).toFixed(3)
      );
      setZoom(newZoom);
    }
  }, []);

  // Reset translation when zoom goes back to 1
  useEffect(() => {
    if (zoom <= 1) setTranslate({ x: 0, y: 0 });
  }, [zoom]);

  if (!isVisible && !isOpen) return null;

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className={`fixed inset-0 z-[9000] flex items-center justify-center transition-opacity duration-150 ${
        isAnimatingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 bg-black/88 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* ── Modal Container ───────────────────────────────────────────────── */}
      <div
        className={`relative z-10 flex flex-col items-center gap-3 transition-transform duration-150 ${
          isAnimatingOut ? 'scale-95' : 'scale-100'
        }`}
        style={{ maxWidth: '90vw', maxHeight: '90vh' }}
      >
        {/* ── Top Controls Bar ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur border border-slate-700/80 shadow-lg text-slate-200 self-end">
          {/* Zoom level indicator */}
          <span className="text-xs font-mono font-semibold text-amber-300 min-w-[3rem] text-center">
            {zoomPercent}%
          </span>

          <div className="w-px h-4 bg-slate-700" />

          {/* Zoom Out */}
          <button
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, parseFloat((z - ZOOM_STEP).toFixed(2))))}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors disabled:opacity-30"
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom arrière (−)"
            title="Zoom arrière (−)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom In */}
          <button
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, parseFloat((z + ZOOM_STEP).toFixed(2))))}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors disabled:opacity-30"
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom avant (+)"
            title="Zoom avant (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Reset */}
          <button
            onClick={() => { setZoom(1); setTranslate({ x: 0, y: 0 }); }}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors"
            aria-label="Réinitialiser le zoom (0)"
            title="Réinitialiser le zoom (0)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-slate-700" />

          {/* Close */}
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-red-600 text-slate-300 hover:text-white transition-colors"
            aria-label="Fermer (Échap)"
            title="Fermer (Échap)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Image Container ───────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-lg shadow-2xl shadow-black/80 border border-slate-700/50 bg-slate-900"
          style={{ maxWidth: '90vw', maxHeight: 'calc(90vh - 60px)' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onDoubleClick={handleDoubleClick}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={isOpen ? src : ''}
            alt={alt}
            loading="eager"
            draggable={false}
            className="block max-w-[88vw] max-h-[calc(88vh-70px)] object-contain select-none transition-transform"
            style={{
              transform: `scale(${zoom}) translate(${translate.x / zoom}px, ${translate.y / zoom}px)`,
              transformOrigin: 'center center',
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              willChange: 'transform',
              transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>

        {/* ── Hint bar ──────────────────────────────────────────────────── */}
        <p className="text-[11px] text-slate-400 text-center pb-1 select-none flex items-center gap-1.5 flex-wrap justify-center">
          <span>🔍 <strong>Double-clic</strong> pour agrandir</span>
          <span>·</span>
          <span>🖱️ <strong>Molette</strong> pour zoomer</span>
          <span>·</span>
          <span>✋ <strong>Glisser</strong> pour naviguer</span>
          <span>·</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">Échap</kbd>
          <span>pour fermer</span>
        </p>
      </div>
    </div>
  );
};
