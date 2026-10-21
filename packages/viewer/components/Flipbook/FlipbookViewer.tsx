'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { useFlipbookStore } from '@/store/useFlipbookStore';
import { PageData } from '@/types/flipbook';
import { PageOverlay } from '@/components/Flipbook/PageOverlay';
import { FlipbookControls } from '@/components/Navigation/FlipbookControls';
import { ThumbnailDrawer } from '@/components/Navigation/ThumbnailDrawer';

interface FlipbookViewerProps {
  pages: PageData[];
}

export const FlipbookViewer: React.FC<FlipbookViewerProps> = ({ pages }) => {
  const {
    currentPage,
    setPage,
    setTotalPages,
    toggleSoundEffects,
  } = useFlipbookStore();

  const bookRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 707 });
  const [isMounted, setIsMounted] = useState(false);

  // Initialize total pages count in store
  useEffect(() => {
    setTotalPages(pages.length);
    setIsMounted(true);
  }, [pages.length, setTotalPages]);

  // Handle responsive resizing for TWO PAGES side-by-side (spread)
  const updateDimensions = useCallback(() => {
    if (typeof window === 'undefined') return;

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    // Available space taking headers and control dock into account
    const availW = Math.min(winW * 0.94, 1600);
    const availH = winH - 130; // Leave room for top bar and bottom dock

    // Two pages side-by-side:
    // Total spread width = 2 * singlePageW
    // Height = singlePageW / 0.707
    const maxSingleWByWidth = (availW - 20) / 2;
    const maxSingleWByHeight = availH * 0.707;
    const singlePageW = Math.floor(Math.min(maxSingleWByWidth, maxSingleWByHeight));
    const singlePageH = Math.floor(singlePageW / 0.707);

    setDimensions({
      width: Math.max(300, singlePageW),
      height: Math.max(424, singlePageH),
    });
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Flip event from react-pageflip
  const onFlip = useCallback(
    (e: { data: number }) => {
      // react-pageflip page index is 0-indexed
      const newPageNumber = e.data + 1;
      setPage(newPageNumber);
    },
    [setPage]
  );

  // Programmatic navigation helpers
  const handlePrev = useCallback(() => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipPrev();
    }
  }, []);

  const handleNext = useCallback(() => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipNext();
    }
  }, []);

  const handleFirst = useCallback(() => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flip(0);
    }
  }, []);

  const handleLast = useCallback(() => {
    if (bookRef.current) {
      // In two-page mode without cover, last spread starts at totalPages - 2 or - 1
      const lastIndex = pages.length % 2 === 0 ? pages.length - 2 : pages.length - 1;
      bookRef.current.pageFlip().flip(Math.max(0, lastIndex));
    }
  }, [pages.length]);

  const handleJumpToPage = useCallback((pageNum: number) => {
    if (bookRef.current) {
      // In 2-page mode without cover, if user enters e.g. 12, flip to index 10 (pages 11 & 12)
      const targetIndex = pageNum % 2 === 0 ? pageNum - 2 : pageNum - 1;
      bookRef.current.pageFlip().flip(Math.max(0, targetIndex));
    }
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          handlePrev();
          break;
        case 'Home':
          e.preventDefault();
          handleFirst();
          break;
        case 'End':
          e.preventDefault();
          handleLast();
          break;
        case 'm':
        case 'M':
          toggleSoundEffects();
          break;
        case 'f':
        case 'F':
          if (!document.fullscreenElement) {
            const enterPromise = document.documentElement.requestFullscreen?.();
            if (enterPromise && typeof enterPromise.catch === 'function') {
              enterPromise.catch(() => {});
            }
          } else {
            const exitPromise = document.exitFullscreen?.();
            if (exitPromise && typeof exitPromise.catch === 'function') {
              exitPromise.catch(() => {});
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleFirst, handleLast, toggleSoundEffects]);

  if (!isMounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-amber-400">
          <div className="w-10 h-10 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-300">Chargement du Flipbook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden py-3 px-2">
      {/* Center Flipbook Container with realistic book shadow */}
      <div className="relative flex items-center justify-center shadow-book rounded-lg">
        {/* HTMLFlipBook Component configured for 2-page spread:
            - usePortrait={false} forces TWO PAGES side-by-side
            - showCover={false} opens pages 1 & 2 together immediately
        */}
        {/* @ts-ignore */}
        <HTMLFlipBook
          ref={bookRef}
          width={dimensions.width}
          height={dimensions.height}
          size="fixed"
          minWidth={300}
          maxWidth={1000}
          minHeight={424}
          maxHeight={1400}
          drawShadow={true}
          maxShadowOpacity={0.4}
          showCover={false}
          usePortrait={false}
          startPage={0}
          flippingTime={700}
          onFlip={onFlip}
          className="flip-book overflow-hidden rounded-md"
          style={{ margin: '0 auto' }}
        >
          {pages.map((p) => (
            <PageOverlay
              key={p.pageNumber}
              page={p}
              pageNumber={p.pageNumber}
            />
          ))}
        </HTMLFlipBook>
      </div>

      {/* Floating Controls Dock */}
      <FlipbookControls
        onPrev={handlePrev}
        onNext={handleNext}
        onFirst={handleFirst}
        onLast={handleLast}
        onJumpToPage={handleJumpToPage}
      />

      {/* Thumbnails Modal Drawer */}
      <ThumbnailDrawer
        pages={pages}
        onSelectPage={handleJumpToPage}
      />
    </div>
  );
};
