'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  HelpCircle,
} from 'lucide-react';
import { useFlipbookStore } from '@/store/useFlipbookStore';

interface FlipbookControlsProps {
  onPrev: () => void;
  onNext: () => void;
  onFirst: () => void;
  onLast: () => void;
  onJumpToPage: (page: number) => void;
}

export const FlipbookControls: React.FC<FlipbookControlsProps> = ({
  onPrev,
  onNext,
  onFirst,
  onLast,
  onJumpToPage,
}) => {
  const {
    currentPage,
    totalPages,
    soundEffectsEnabled,
    toggleSoundEffects,
    toggleThumbnails,
    isFullscreen,
    toggleFullscreen,
    setIsFullscreen,
  } = useFlipbookStore();

  const [showHelp, setShowHelp] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Sync fullscreen state with native browser events (Esc key, F11, etc.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
      setIsFullscreen(isNowFullscreen);

      // Trigger resize so flipbook resizes to fill fullscreen
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 150);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [setIsFullscreen]);

  // In 2-page spread mode:
  const leftPage = currentPage % 2 === 1 ? currentPage : Math.max(1, currentPage - 1);
  const rightPage = Math.min(totalPages, leftPage + 1);

  useEffect(() => {
    setInputVal(`${leftPage}`);
  }, [leftPage]);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputVal, 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      onJumpToPage(val);
      setIsEditing(false);
    } else {
      setInputVal(`${leftPage}`);
      setIsEditing(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/60 shadow-2xl shadow-black/60 text-slate-200">
        {/* First Page */}
        <button
          onClick={onFirst}
          disabled={leftPage <= 1}
          className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-amber-400 transition-colors"
          title="Premières pages (1 - 2)"
        >
          <ChevronsLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Previous Page */}
        <button
          onClick={onPrev}
          disabled={leftPage <= 1}
          className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-amber-400 transition-colors"
          title="Pages précédentes (Flèche Gauche)"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Page spread indicator (e.g. Pages 11 - 12 / 34) */}
        <div className="flex items-center gap-1.5 px-2">
          {isEditing ? (
            <form onSubmit={handleInputSubmit}>
              <input
                type="text"
                autoFocus
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onBlur={handleInputSubmit}
                className="w-12 text-center bg-slate-800 border border-amber-400 rounded py-0.5 text-xs sm:text-sm font-semibold text-amber-300 focus:outline-none"
              />
            </form>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400 text-xs sm:text-sm font-semibold text-amber-300 transition-colors"
              title="Cliquer pour saisir un numéro de page"
            >
              Pages {leftPage} - {rightPage}
            </button>
          )}
          <span className="text-xs sm:text-sm text-slate-400 font-medium">/ {totalPages}</span>
        </div>

        {/* Next Page */}
        <button
          onClick={onNext}
          disabled={rightPage >= totalPages}
          className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-amber-400 transition-colors"
          title="Pages suivantes (Flèche Droite)"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Last Page */}
        <button
          onClick={onLast}
          disabled={rightPage >= totalPages}
          className="p-1.5 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-300 hover:text-amber-400 transition-colors"
          title="Dernières pages"
        >
          <ChevronsRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="w-[1px] h-5 bg-slate-700 mx-0.5" />

        {/* Thumbnail drawer trigger */}
        <button
          onClick={() => toggleThumbnails()}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors"
          title="Aperçu des 34 miniatures"
        >
          <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Sound effects toggle */}
        <button
          onClick={toggleSoundEffects}
          className={`p-1.5 rounded-lg transition-colors ${
            soundEffectsEnabled
              ? 'text-amber-400 hover:bg-slate-800'
              : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
          }`}
          title={soundEffectsEnabled ? 'Bruitage de page activé' : 'Bruitage désactivé'}
        >
          {soundEffectsEnabled ? (
            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>

        {/* Fullscreen toggle (Always visible) */}
        <button
          onClick={toggleFullscreen}
          className={`p-1.5 rounded-lg transition-all duration-200 ${
            isFullscreen
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30 ring-1 ring-amber-300'
              : 'hover:bg-slate-800 text-slate-300 hover:text-amber-400'
          }`}
          title={isFullscreen ? 'Quitter le mode plein écran (F ou Échap)' : 'Mode plein écran (F)'}
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>

        {/* Help button */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
          title="Aide & Raccourcis"
        >
          <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Shortcuts Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-sm w-full shadow-2xl text-slate-200 text-xs sm:text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" /> Navigation & Raccourcis
            </h3>
            <ul className="space-y-2 text-slate-300">
              <li className="flex justify-between">
                <span>Plein écran :</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-300">
                  Touche F ou bouton ⛶
                </kbd>
              </li>
              <li className="flex justify-between">
                <span>Quitter plein écran :</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">
                  Échap ou F
                </kbd>
              </li>
              <li className="flex justify-between">
                <span>Tourner les pages :</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">
                  Flèches ← / →
                </kbd>
              </li>
              <li className="flex justify-between">
                <span>Première / Dernière page :</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">
                  Home / End
                </kbd>
              </li>
              <li className="flex justify-between">
                <span>Activer / Couper son :</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">
                  Touche M
                </kbd>
              </li>
              <li className="flex justify-between">
                <span>Tourner à la souris :</span>
                <span className="text-slate-400 text-[11px]">Glisser les coins de page</span>
              </li>
            </ul>
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
