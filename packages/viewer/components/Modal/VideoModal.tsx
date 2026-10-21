'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Play, AlertCircle, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { getYouTubeEmbedUrl } from '@/utils/youtube';

interface VideoModalProps {
  url: string | null;
  title?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  url,
  title,
  isOpen,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);

  const embedUrl = url ? getYouTubeEmbedUrl(url) : null;

  // Animation d'ouverture et focus sur le bouton fermer
  useEffect(() => {
    if (isOpen) {
      setIsAnimatingOut(false);
      setIsVisible(true);
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 80);

      // Activer automatiquement le mode plein écran à l'ouverture de façon sûre
      if (!document.fullscreenElement && videoWrapRef.current) {
        const p = videoWrapRef.current.requestFullscreen?.();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      }

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (document.fullscreenElement) {
      const p = document.exitFullscreen?.();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    }
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsAnimatingOut(false);
      onClose();
    }, 150);
  }, [onClose]);

  const toggleFullscreen = useCallback(() => {
    if (!videoWrapRef.current) return;
    if (!document.fullscreenElement) {
      const enterPromise = videoWrapRef.current.requestFullscreen?.();
      if (enterPromise && typeof enterPromise.catch === 'function') {
        enterPromise.catch(() => {});
      }
    } else {
      const exitPromise = document.exitFullscreen?.();
      if (exitPromise && typeof exitPromise.catch === 'function') {
        exitPromise.catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Fermeture par la touche Échap (Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!document.fullscreenElement) {
          e.stopPropagation();
          handleClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, handleClose]);

  const shouldRender = isOpen || isVisible;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Vidéo YouTube'}
      style={{ display: shouldRender ? 'flex' : 'none' }}
      className={`fixed inset-0 z-[9500] items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-md transition-opacity duration-150 select-none ${
        isAnimatingOut ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleClose} // Clic en dehors de la boîte = fermeture
    >
      {/* Fenêtre Modale (Format cinéma immersif) */}
      <div
        className={`relative w-full max-w-6xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden transition-all duration-150 transform ${
          isAnimatingOut ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()} // Évite de fermer lors d'un clic sur la modale
      >
        {/* Barre d'en-tête de la modale */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-red-600/20 text-red-500 border border-red-500/30 flex-shrink-0">
              <Play className="w-3.5 h-3.5 fill-current" />
            </span>
            <h2 className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
              {title || 'Vidéo YouTube'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-sky-400 bg-sky-950/40 border border-sky-800/40 hover:bg-sky-900/50 transition-colors mr-1"
                title="Ouvrir sur YouTube"
              >
                <span>YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran (F)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              aria-label="Fermer la vidéo"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fermer (Échap)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Zone Vidéo Responsive avec Support Plein Écran Natif */}
        <div
          ref={videoWrapRef}
          id="video-modal-wrap"
          className="relative w-full aspect-video bg-black flex items-center justify-center [&:fullscreen]:w-screen [&:fullscreen]:h-screen [&:fullscreen]:max-w-none [&:fullscreen]:aspect-auto [&:-webkit-full-screen]:w-screen [&:-webkit-full-screen]:h-screen [&:-webkit-full-screen]:max-w-none [&:-webkit-full-screen]:aspect-auto"
        >
          {isFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label="Quitter le plein écran"
              className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-black/75 hover:bg-black/95 text-white border border-white/20 text-xs backdrop-blur-md shadow-2xl transition-all cursor-pointer opacity-80 hover:opacity-100"
              title="Quitter le plein écran (Échap)"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Quitter le plein écran</span>
            </button>
          )}

          {embedUrl && shouldRender ? (
            <iframe
              key={embedUrl}
              src={embedUrl}
              title={title || 'Lecteur Vidéo YouTube'}
              className="absolute inset-0 w-full h-full border-0"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            />
          ) : shouldRender ? (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-400">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-sm font-medium">Lien vidéo non reconnu ou non disponible.</p>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-amber-300 transition-colors"
                >
                  <span>Ouvrir le lien externe</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
