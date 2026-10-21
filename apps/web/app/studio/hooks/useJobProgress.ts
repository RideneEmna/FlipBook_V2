'use client';

import { useEffect, useRef, useState } from 'react';
import { watchJobProgress, type ConvertedPage } from '@/lib/studioApi';
import { useTranslation } from '@/i18n/useTranslation';
import type { Phase, ProgressState } from '../types';


type UseJobProgressOptions = {
  onFail: (message: string) => void;
};

type UseJobProgressReturn = {
  jobId: string | null;
  progress: ProgressState;
  pages: ConvertedPage[];
  startWatching: (newJobId: string) => void;
  stopWatching: () => void;
  resetJob: () => void;
  setPages: (pages: ConvertedPage[]) => void;
  setPhase: (phase: Phase) => void;
};

/**
 * Gère le suivi SSE d'un job de conversion.
 * Responsabilité unique : ouvrir/fermer le flux EventSource et synchroniser
 * l'état de progression (percent, step, message, pages).
 */
export function useJobProgress(
  setPhase: (phase: Phase) => void,
  { onFail }: UseJobProgressOptions
): UseJobProgressReturn {
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState>({
    percent: 0,
    step: '',
    message: '',
  });
  const [pages, setPages] = useState<ConvertedPage[]>([]);
  const stopRef = useRef<(() => void) | null>(null);

  // Cleanup automatique au démontage du composant
  useEffect(() => () => stopRef.current?.(), []);

  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
  };

  const t = useTranslation();

  const startWatching = (newJobId: string) => {
    setJobId(newJobId);
    setPhase('converting');
    stopRef.current = watchJobProgress(
      newJobId,
      (snapshot) => {
        setProgress({
          percent: snapshot.percent,
          step: snapshot.step,
          message: snapshot.message,
        });
        if (snapshot.status === 'completed') {
          setPages(snapshot.pages ?? []);
          setPhase('done');
        } else if (snapshot.status === 'error') {
          onFail(snapshot.error ?? t.errors.conversionFailed);
        }
      },
      () => onFail(t.errors.connectionLost)
    );
  };


  const resetJob = () => {
    stop();
    setJobId(null);
    setPages([]);
    setProgress({ percent: 0, step: '', message: '' });
  };

  return {
    jobId,
    progress,
    pages,
    startWatching,
    stopWatching: stop,
    resetJob,
    setPages,
    setPhase,
  };
}
