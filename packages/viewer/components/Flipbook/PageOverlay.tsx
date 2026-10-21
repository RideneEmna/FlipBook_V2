'use client';

import React, { useCallback } from 'react';
import { PageData } from '@/types/flipbook';
import { AudioButton } from '@/components/Interactive/AudioButton';
import { ZoomZone } from '@/components/Interactive/ZoomZone';
import { VideoButton } from '@/components/Interactive/VideoButton';
import { useFlipbookStore } from '@/store/useFlipbookStore';

interface PageOverlayProps {
  page: PageData;
  isCover?: boolean;
  pageNumber?: number;
}

export const PageOverlay = React.forwardRef<HTMLDivElement, PageOverlayProps>(
  ({ page, isCover, pageNumber, ...props }, ref) => {
    const isLeftPage = (page.pageNumber % 2) === 1;
    const { openImageModal } = useFlipbookStore();

    // Clic sur la page → ouvre en zoom HD dans le modal (R2)
    const handlePageClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        // On s'assure qu'on n'intercepte pas les clics sur les boutons audio ou zoom zones
        const target = e.target as HTMLElement;
        const isInteraction = target.closest('button, [role="button"]');
        if (isInteraction) return;

        openImageModal(page.imagePath, page.title || `Page ${page.pageNumber}`);
      },
      [openImageModal, page.imagePath, page.title, page.pageNumber]
    );

    return (
      <div
        ref={ref}
        className="page-item relative w-full h-full bg-white select-none overflow-hidden"
        data-density={isCover ? 'hard' : 'soft'}
        {...props}
      >
        {/* Background 300 DPI WebP Image — cliquable pour zoom HD */}
        <img
          src={page.imagePath}
          alt={page.title || `Page ${page.pageNumber}`}
          loading="lazy"
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Spine gradient overlay */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
            isLeftPage
              ? 'bg-gradient-to-r from-transparent via-transparent to-black/15'
              : 'bg-gradient-to-r from-black/15 via-transparent to-transparent'
          }`}
        />

        {/* Paper texture subtle sheen */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/5 pointer-events-none" />

        {/* Outer edge subtle curve shadow */}
        <div
          className={`absolute inset-0 pointer-events-none ${
            isLeftPage
              ? 'bg-gradient-to-r from-black/5 via-transparent to-transparent'
              : 'bg-gradient-to-r from-transparent via-transparent to-black/5'
          }`}
        />

        {/* Zone de clic principale : toute la page est zoomable (curseur loupe) */}
        <div
          className="absolute inset-0 cursor-zoom-in group"
          onClick={handlePageClick}
          title="Cliquer pour agrandir en HD"
          aria-label={`Agrandir la page ${page.pageNumber} en HD`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openImageModal(page.imagePath, page.title || `Page ${page.pageNumber}`);
            }
          }}
        >
          {/* Badge HD discret — apparaît au hover */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/80 text-amber-300 text-[10px] font-semibold border border-amber-400/40 backdrop-blur-sm shadow-md pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/>
            </svg>
            Zoom HD
          </div>
        </div>

        {/* Boutons audio et zones zoom interactives (au-dessus du layer clic page) */}
        <div className="absolute inset-0 pointer-events-none">
          {page.interactions?.map((interaction) => {
            if (interaction.type === 'audio') {
              return (
                <div key={interaction.id} className="pointer-events-auto">
                  <AudioButton interaction={interaction} />
                </div>
              );
            }
            if (interaction.type === 'zoom') {
              return (
                <ZoomZone
                  key={interaction.id}
                  interaction={interaction}
                />
              );
            }
            if (interaction.type === 'video') {
              return (
                <div key={interaction.id} className="pointer-events-auto">
                  <VideoButton interaction={interaction} />
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* Subtle page number corner indicator */}
        <div
          className={`absolute bottom-2 ${
            isLeftPage ? 'left-3' : 'right-3'
          } text-[10px] font-mono text-slate-400/60 pointer-events-none`}
        >
          {page.pageNumber}
        </div>
      </div>
    );
  }
);

PageOverlay.displayName = 'PageOverlay';
