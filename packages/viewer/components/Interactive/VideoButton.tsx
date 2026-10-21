'use client';

import React from 'react';
import { Play } from 'lucide-react';
import { useFlipbookStore } from '@/store/useFlipbookStore';
import { VideoInteraction } from '@/types/flipbook';

interface VideoButtonProps {
  interaction: VideoInteraction;
}

export const VideoButton: React.FC<VideoButtonProps> = ({ interaction }) => {
  const { openVideoModal } = useFlipbookStore();

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation(); // Évite de déclencher le feuilletage de page
    openVideoModal(interaction.youtubeUrl, interaction.title || 'Vidéo explicative');

    // Déclencher le plein écran de façon sécurisée (sans try/catch synchrone sur Promise)
    const wrap = document.getElementById('video-modal-wrap');
    if (wrap && !document.fullscreenElement) {
      const p = wrap.requestFullscreen?.();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    }
  };

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
      style={{
        left: interaction.x,
        top: interaction.y,
      }}
      title={interaction.title || 'Regarder la vidéo'}
    >
      {/* Halo lumineux animé au survol */}
      <span className="absolute -inset-1 rounded-full bg-red-500/20 group-hover:bg-red-500/40 group-hover:animate-ping transition-all pointer-events-none" />

      <button
        type="button"
        onClick={handleOpen}
        aria-label={interaction.title ? `Regarder la vidéo : ${interaction.title}` : 'Regarder la vidéo YouTube'}
        className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900/90 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 hover:border-red-400 shadow-lg shadow-black/50 hover:shadow-red-600/40 transition-all duration-200 hover:scale-110 cursor-pointer"
      >
        <Play className="w-3.5 h-3.5 fill-current ml-0.5 transition-transform group-hover:scale-110" />
      </button>

      {/* Infobulle (Tooltip) au survol */}
      {interaction.title && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/95 text-[11px] font-medium text-red-200 whitespace-nowrap shadow-xl border border-red-500/30 pointer-events-none z-30 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span>{interaction.title}</span>
        </div>
      )}
    </div>
  );
};
