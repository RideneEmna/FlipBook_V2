'use client';

import React, { useRef, useState, useEffect } from 'react';
import { LayoutGrid, FilePlus2, FileUp, Copy, Trash2 } from 'lucide-react';
import type { StudioConfigPage } from './types';
import { renderPageToCanvas, loadPdfDocument } from './pdfLoader';

interface Props {
  pages: StudioConfigPage[];
  currentPageIndex: number;
  onSelectPage: (idx: number) => void;
  onDuplicatePage: (idx: number) => void;
  onDeletePage: (idx: number) => void;
  onAddBlankPage: () => void;
  onImportPdfPages: (doc: any, fileName: string) => void;
  onReorderPages: (fromIdx: number, toIdx: number) => void;
  onToast: (msg: string) => void;
  /** 'strip' (défaut) = bande horizontale ; 'grid' = grille 2 colonnes (sidebar). */
  layout?: 'strip' | 'grid';
}

export default function PageThumbnailsStrip({
  pages,
  currentPageIndex,
  onSelectPage,
  onDuplicatePage,
  onDeletePage,
  onAddBlankPage,
  onImportPdfPages,
  onReorderPages,
  onToast,
  layout = 'strip',
}: Props) {
  const isGrid = layout === 'grid';
  const [jumpValue, setJumpValue] = useState('');
  const currentCardRef = useRef<HTMLDivElement | null>(null);

  // Keep the current page visible in the sidebar grid
  useEffect(() => {
    if (isGrid) currentCardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [isGrid, currentPageIndex]);

  const handleJump = () => {
    const n = parseInt(jumpValue, 10);
    if (!Number.isFinite(n) || n < 1 || n > pages.length) {
      onToast(`Entrez un numéro entre 1 et ${pages.length}.`);
      return;
    }
    onSelectPage(n - 1);
    setJumpValue('');
  };
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const doc = await loadPdfDocument(file);
      onImportPdfPages(doc, file.name);
      onToast(`${doc.numPages} page(s) importée(s) depuis ${file.name}`);
    } catch (err) {
      console.error(err);
      onToast('Impossible de lire ce fichier PDF.');
    }
    e.target.value = '';
  };

  return (
    <div className={isGrid ? 'flex flex-col gap-3' : 'mt-6 pt-5 border-t border-slate-800'}>
      {isGrid ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={pages.length}
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleJump();
            }}
            placeholder={`Aller à la page (1-${pages.length})`}
            aria-label="Aller à la page"
            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={handleJump}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition active:scale-95"
          >
            OK
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-indigo-400" />
            <span>Table des pages</span>
          </h3>
          <span className="text-xs text-slate-500">
            Glissez une vignette pour changer l'ordre
          </span>
        </div>
      )}

      <div
        className={
          isGrid
            ? 'grid grid-cols-2 gap-2.5 pr-1'
            : 'flex gap-3 overflow-x-auto pb-3 custom-scrollbar'
        }
      >
        {pages.map((p, idx) => {
          const isCurrent = idx === currentPageIndex;
          const isOver = idx === overIndex && draggedIndex !== null && draggedIndex !== idx;

          return (
            <div
              key={p.id}
              ref={isCurrent ? currentCardRef : undefined}
              draggable
              onDragStart={(e) => {
                setDraggedIndex(idx);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(idx));
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(idx);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== idx) {
                  onReorderPages(draggedIndex, idx);
                }
                setDraggedIndex(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setOverIndex(null);
              }}
              onClick={() => onSelectPage(idx)}
              className={[
                'group relative rounded-xl p-1.5 transition-all cursor-grab active:cursor-grabbing border select-none',
                isGrid ? 'w-full' : 'flex-none w-[104px]',
                isCurrent
                  ? 'border-indigo-500 bg-indigo-600/20 shadow-md ring-1 ring-indigo-500'
                  : 'border-slate-800 bg-slate-900/70 hover:border-indigo-500/60',
                isOver ? 'ring-2 ring-dashed ring-indigo-400 scale-[1.02]' : '',
              ].join(' ')}
            >
              {/* Canvas Thumbnail */}
              <div className="relative rounded-md overflow-hidden bg-white shadow-inner">
                <ThumbnailCanvas page={p} />

                {/* Floating Hover Actions */}
                <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-1 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicatePage(idx);
                    }}
                    title="Dupliquer cette page"
                    className="w-5 h-5 rounded-md bg-slate-950/85 hover:bg-slate-900 text-slate-200 flex items-center justify-center transition active:scale-90"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pages.length <= 1) {
                        onToast('Le flipbook doit contenir au moins une page.');
                        return;
                      }
                      onDeletePage(idx);
                    }}
                    title="Supprimer cette page"
                    className="w-5 h-5 rounded-md bg-slate-950/85 hover:bg-red-950 text-slate-200 hover:text-red-400 flex items-center justify-center transition active:scale-90"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Page Number & Badge */}
              <div className="flex items-center justify-between mt-1.5 px-0.5">
                <span className="text-[11px] font-semibold text-slate-300">
                  Page {idx + 1}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                  {p.items.length}
                </span>
              </div>
            </div>
          );
        })}

        {/* Action: Add Blank Page */}
        <button
          type="button"
          onClick={onAddBlankPage}
          className={`${isGrid ? 'w-full min-h-[96px]' : 'flex-none w-[104px]'} rounded-xl border-2 border-dashed border-indigo-500/35 hover:border-indigo-500 bg-slate-900/40 hover:bg-indigo-600/10 text-indigo-300 hover:text-white text-[11px] font-semibold flex flex-col items-center justify-center gap-1.5 p-2.5 text-center transition-all active:scale-95`}
        >
          <FilePlus2 className="w-5 h-5 text-indigo-400" />
          <span>Ajouter une page blanche</span>
        </button>

        {/* Action: Import Pages from PDF */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`${isGrid ? 'w-full min-h-[96px]' : 'flex-none w-[104px]'} rounded-xl border-2 border-dashed border-indigo-500/35 hover:border-indigo-500 bg-slate-900/40 hover:bg-indigo-600/10 text-indigo-300 hover:text-white text-[11px] font-semibold flex flex-col items-center justify-center gap-1.5 p-2.5 text-center transition-all active:scale-95 cursor-pointer`}
        >
          <FileUp className="w-5 h-5 text-indigo-400" />
          <span>Importer des pages d'un PDF</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={handleFilePicked}
        />
      </div>
    </div>
  );
}

function ThumbnailCanvas({ page }: { page: StudioConfigPage }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isRendered, setIsRendered] = useState<boolean>(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let active = true;
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderPageToCanvas(page, canvas, 140)
      .then(() => {
        if (active) setIsRendered(true);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isVisible, page.id, page.kind, page.num, page.doc, page.imageUrl]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[3/4] bg-slate-900/60 rounded flex items-center justify-center overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        width={96}
        height={128}
        className={`w-full h-auto block bg-white transition-opacity duration-200 ${
          isRendered ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {!isRendered && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] text-slate-500 bg-slate-900/80">
          <span className="font-semibold text-slate-400">p. {page.num ?? 1}</span>
        </div>
      )}
    </div>
  );
}
