'use client';

import React from 'react';
import { ZoomIn } from 'lucide-react';
import { useFlipbookStore } from '@/store/useFlipbookStore';
import { ZoomInteraction } from '@/types/flipbook';

interface ZoomZoneProps {
  interaction: ZoomInteraction;
}

export const ZoomZone: React.FC<ZoomZoneProps> = ({ interaction }) => {
  const { openImageModal } = useFlipbookStore();

  const handleOpen = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation(); // Empêcher le déclenchement du feuilletage
    openImageModal(interaction.hiresSrc, interaction.title || 'Zoom HD');
  };

  return (
    <div
      className="absolute group transition-all duration-200 pointer-events-auto z-10 cursor-zoom-in rounded-xl select-none"
      style={{
        left: interaction.x,
        top: interaction.y,
        width: interaction.width,
        height: interaction.height,
      }}
      onClick={handleOpen}
      title={interaction.title ? `${interaction.title} (Cliquer pour agrandir en HD)` : 'Cliquer pour agrandir en HD'}
      role="button"
      tabIndex={0}
      aria-label={`Agrandir : ${interaction.title || 'Image'}`}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpen(e)}
    >
      {/* Zone hover avec contour et brillance discrète */}
      <div className="absolute inset-0 border border-transparent group-hover:border-amber-400/70 rounded-xl transition-all duration-200 group-hover:bg-amber-400/5 pointer-events-none group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]" />

      {/* Badge Zoom HD discret dans le coin supérieur droit */}
      <div
        className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 group-hover:bg-amber-500 text-amber-300 group-hover:text-slate-950 text-[11px] font-semibold shadow-md border border-amber-400/40 pointer-events-none group-hover:scale-105"
      >
        <ZoomIn className="w-3.5 h-3.5" />
        <span>Zoom HD</span>
      </div>
    </div>
  );
};
