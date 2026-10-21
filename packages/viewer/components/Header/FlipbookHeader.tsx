'use client';

import React from 'react';
import { Book, Square, Maximize, Minimize } from 'lucide-react';
import { useFlipbookStore } from '@/store/useFlipbookStore';

interface FlipbookHeaderProps {
  title: string;
}

export const FlipbookHeader: React.FC<FlipbookHeaderProps> = ({ title }) => {
  const {
    currentPage,
    totalPages,
    playingAudioId,
    stopAudio,
    toggleThumbnails,
    isFullscreen,
    toggleFullscreen,
  } = useFlipbookStore();

  const leftPage = currentPage % 2 === 1 ? currentPage : Math.max(1, currentPage - 1);
  const rightPage = Math.min(totalPages, leftPage + 1);

  return (
    <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-slate-200 z-30 shadow-md">
      {/* Brand & Book Title */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
          <Book className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-xs sm:text-sm font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
            <span>{title}</span>
            <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
              Double Page
            </span>
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-400">
            Unité 1 : Exercices interactifs, audio & zoom haute fidélité
          </p>
        </div>
      </div>

      {/* Center Audio Status if playing */}
      {playingAudioId && (
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-pulse">
          <div className="flex items-center gap-0.5 h-3">
            <span className="w-0.5 h-full bg-amber-400 rounded-full animate-bounce" />
            <span className="w-0.5 h-2/3 bg-amber-400 rounded-full animate-bounce [animation-delay:0.15s]" />
            <span className="w-0.5 h-full bg-amber-400 rounded-full animate-bounce [animation-delay:0.3s]" />
          </div>
          <span className="text-[11px] font-medium">Lecture audio en cours...</span>
          <button
            onClick={stopAudio}
            className="p-0.5 hover:bg-amber-500/30 rounded text-amber-200 transition-colors"
            title="Arrêter la lecture"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>
        </div>
      )}

      {/* Right Controls: Pages TOC & Fullscreen Button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm ${
            isFullscreen
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-amber-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-300 border-slate-700'
          }`}
          title={isFullscreen ? 'Quitter le mode plein écran (Échap ou F)' : 'Mode plein écran (F)'}
        >
          {isFullscreen ? (
            <>
              <Minimize className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quitter Plein Écran</span>
            </>
          ) : (
            <>
              <Maximize className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Plein Écran</span>
            </>
          )}
        </button>

        {/* Pages TOC Button */}
        <button
          onClick={() => toggleThumbnails(true)}
          className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Ouvrir la table des matières & miniatures"
        >
          <span>Pages</span>
          <span className="text-slate-400">
            {leftPage} - {rightPage} / {totalPages}
          </span>
        </button>
      </div>
    </header>
  );
};
