'use client';

import React from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useFlipbookStore } from '@/store/useFlipbookStore';
import { AudioInteraction } from '@/types/flipbook';

interface AudioButtonProps {
  interaction: AudioInteraction;
}

export const AudioButton: React.FC<AudioButtonProps> = ({ interaction }) => {
  const { playingAudioId, playAudio, stopAudio } = useFlipbookStore();
  const isPlaying = playingAudioId === interaction.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering page flip when clicking button
    if (isPlaying) {
      stopAudio();
    } else {
      playAudio(interaction.id, interaction.src);
    }
  };

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
      style={{
        left: interaction.x,
        top: interaction.y,
      }}
      title={interaction.title || 'Play audio'}
    >
      {/* Wave pulse animation when playing */}
      {isPlaying && (
        <span className="absolute -inset-1.5 rounded-full bg-amber-400/40 animate-ping pointer-events-none" />
      )}

      <button
        type="button"
        onClick={handleClick}
        aria-label={interaction.title || 'Audio track'}
        className={`relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-md transition-all duration-200 cursor-pointer ${
          isPlaying
            ? 'bg-amber-500 text-slate-950 scale-110 shadow-amber-500/50 ring-2 ring-amber-300'
            : 'bg-slate-900/80 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-400/40 hover:scale-110 shadow-black/40'
        }`}
      >
        {isPlaying ? (
          <Volume2 className="w-4 h-4 animate-bounce" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
        )}
      </button>

      {/* Tooltip on hover */}
      {interaction.title && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 hidden group-hover:flex items-center px-2 py-0.5 rounded bg-slate-900/90 text-[11px] text-amber-200 whitespace-nowrap shadow-lg border border-slate-700 pointer-events-none z-30">
          <span>{interaction.title}</span>
        </div>
      )}
    </div>
  );
};
