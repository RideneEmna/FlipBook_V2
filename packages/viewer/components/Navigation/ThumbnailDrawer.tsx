'use client';

import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { useFlipbookStore } from '@/store/useFlipbookStore';
import { PageData } from '@/types/flipbook';

interface ThumbnailDrawerProps {
  pages: PageData[];
  onSelectPage: (pageNumber: number) => void;
}

export const ThumbnailDrawer: React.FC<ThumbnailDrawerProps> = ({
  pages,
  onSelectPage,
}) => {
  const { currentPage, isThumbnailsOpen, toggleThumbnails } = useFlipbookStore();

  if (!isThumbnailsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Background click to close */}
      <div
        className="flex-1"
        onClick={() => toggleThumbnails(false)}
      />

      {/* Drawer content */}
      <div className="bg-slate-900/95 border-t border-slate-700/80 p-4 sm:p-6 max-h-[75vh] flex flex-col rounded-t-2xl shadow-2xl shadow-black">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm sm:text-base font-semibold text-slate-100">
              Table des Matières & Miniatures (34 Pages)
            </h2>
          </div>
          <button
            onClick={() => toggleThumbnails(false)}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thumbnails grid */}
        <div className="overflow-y-auto py-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
          {pages.map((p) => {
            const isSelected = currentPage === p.pageNumber;
            return (
              <button
                key={p.pageNumber}
                onClick={() => {
                  onSelectPage(p.pageNumber);
                  toggleThumbnails(false);
                }}
                className={`group relative flex flex-col items-center rounded-lg p-1.5 transition-all duration-200 text-left ${
                  isSelected
                    ? 'ring-2 ring-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/20 scale-105'
                    : 'hover:bg-slate-800/80 border border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="relative w-full aspect-[0.707] overflow-hidden rounded bg-slate-800 shadow">
                  <img
                    src={p.thumbPath}
                    alt={`Thumbnail page ${p.pageNumber}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-amber-500/20 border border-amber-400 rounded pointer-events-none" />
                  )}
                </div>
                <div className="w-full mt-1.5 flex items-center justify-between text-[11px]">
                  <span
                    className={`font-semibold ${
                      isSelected ? 'text-amber-400' : 'text-slate-300'
                    }`}
                  >
                    p. {p.pageNumber}
                  </span>
                  {p.interactions?.length > 0 && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
                      {p.interactions.length} interact.
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
