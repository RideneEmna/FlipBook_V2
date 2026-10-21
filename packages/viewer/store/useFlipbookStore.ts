import { create } from 'zustand';

interface FlipbookState {
  currentPage: number;
  totalPages: number;
  playingAudioId: string | null;
  playingAudioUrl: string | null;
  soundEffectsEnabled: boolean;
  isThumbnailsOpen: boolean;
  isFullscreen: boolean;

  // Modal Lightbox State
  isModalOpen: boolean;
  modalImageSrc: string | null;
  modalImageAlt: string | null;

  // Video Modal State
  isVideoModalOpen: boolean;
  videoUrl: string | null;
  videoTitle: string | null;

  audioElement: HTMLAudioElement | null;

  // Actions
  setTotalPages: (total: number) => void;
  setPage: (page: number) => void;
  playAudio: (id: string, url: string) => void;
  stopAudio: () => void;
  toggleSoundEffects: () => void;
  toggleThumbnails: (open?: boolean) => void;
  setIsFullscreen: (fullscreen: boolean) => void;
  toggleFullscreen: () => void;
  playFlipSound: () => void;

  // Modal Actions
  openImageModal: (src: string, alt: string) => void;
  closeImageModal: () => void;

  // Video Modal Actions
  openVideoModal: (url: string, title?: string) => void;
  closeVideoModal: () => void;
}

export const useFlipbookStore = create<FlipbookState>((set, get) => ({
  currentPage: 1,
  totalPages: 34,
  playingAudioId: null,
  playingAudioUrl: null,
  soundEffectsEnabled: true,
  isThumbnailsOpen: false,
  isFullscreen: false,
  isModalOpen: false,
  modalImageSrc: null,
  modalImageAlt: null,
  isVideoModalOpen: false,
  videoUrl: null,
  videoTitle: null,
  audioElement: null,

  setTotalPages: (total) => set({ totalPages: total }),

  // Règle métier : Lorsqu'on tourne une page, l'audio en cours doit s'arrêter.
  setPage: (page) => {
    const { currentPage, stopAudio, playFlipSound } = get();
    if (page !== currentPage) {
      stopAudio();
      playFlipSound();
      set({ currentPage: page });
    }
  },

  playAudio: (id, url) => {
    const { audioElement, playingAudioId } = get();

    if (playingAudioId === id) {
      get().stopAudio();
      return;
    }

    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    if (typeof Audio === 'undefined') return;

    const audio = new Audio(url);
    audio.onended = () => {
      set({ playingAudioId: null, playingAudioUrl: null });
    };
    audio.onerror = () => {
      console.warn(`Could not load audio from ${url}`);
      set({ playingAudioId: null, playingAudioUrl: null });
    };

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err) => {
        console.warn('Audio playback prevented or failed:', err);
      });
    }

    set({
      playingAudioId: id,
      playingAudioUrl: url,
      audioElement: audio,
    });
  },

  stopAudio: () => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    set({ playingAudioId: null, playingAudioUrl: null });
  },

  toggleSoundEffects: () =>
    set((state) => ({ soundEffectsEnabled: !state.soundEffectsEnabled })),

  toggleThumbnails: (open) =>
    set((state) => ({
      isThumbnailsOpen: open !== undefined ? open : !state.isThumbnailsOpen,
    })),

  setIsFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),

  toggleFullscreen: () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      const p = document.documentElement.requestFullscreen?.();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    } else {
      const p = document.exitFullscreen?.();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
    }
  },

  playFlipSound: () => {
    const { soundEffectsEnabled } = get();
    if (!soundEffectsEnabled || typeof window === 'undefined' || typeof Audio === 'undefined') return;

    const flipSound = new Audio('/audio/page-flip.wav');
    flipSound.volume = 0.5;
    const playPromise = flipSound.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Ignore background audio autoplay restrictions
      });
    }
  },

  // Règle R2 & R4 : stopAudio() est appelé à l'ouverture du modal
  openImageModal: (src: string, alt: string) => {
    get().stopAudio();
    set({ isModalOpen: true, modalImageSrc: src, modalImageAlt: alt });
  },

  closeImageModal: () => {
    set({ isModalOpen: false, modalImageSrc: null, modalImageAlt: null });
  },

  // Video Modal Actions
  openVideoModal: (url: string, title?: string) => {
    get().stopAudio();
    set({
      isVideoModalOpen: true,
      videoUrl: url,
      videoTitle: title || null,
    });
  },

  closeVideoModal: () => {
    set({
      isVideoModalOpen: false,
      videoUrl: null,
      videoTitle: null,
    });
  },
}));
