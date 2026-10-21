'use client';

import { useState } from 'react';
import { uploadPDF, MAX_UPLOAD_MB } from '@/lib/studioApi';
import type { ConversionSettings } from '@/components/Studio/ConversionOptions';
import { useTranslation } from '@/i18n/useTranslation';
import type { Phase } from '../types';

type UseFileConversionOptions = {
  settings: ConversionSettings;
  setPhase: (phase: Phase) => void;
  onFail: (message: string) => void;
  onUploadSuccess: (jobId: string) => void;
};

type UseFileConversionReturn = {
  fileName: string;
  error: string;
  handleFile: (file: File) => Promise<void>;
  resetFile: () => void;
};


/**
 * Gère la validation et l'upload d'un fichier PDF.
 * Responsabilité unique : valider le fichier, l'envoyer à l'API,
 * et notifier le résultat via les callbacks fournis.
 */
export function useFileConversion({
  settings,
  setPhase,
  onFail,
  onUploadSuccess,
}: UseFileConversionOptions): UseFileConversionReturn {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const t = useTranslation();

  const handleFile = async (file: File) => {
    let problem: string | null = null;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      problem = t.errors.pdfOnly;
    } else if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      problem = t.errors.tooLarge(MAX_UPLOAD_MB);
    }

    if (problem) {
      onFail(problem);
      setError(problem);
      return;
    }

    setError('');
    setFileName(file.name);
    setPhase('uploading');

    try {
      const { jobId } = await uploadPDF(file, settings);
      onUploadSuccess(jobId);
    } catch (e) {
      const message = e instanceof Error ? e.message : t.errors.sendFailed;
      onFail(message);
      setError(message);
    }
  };


  const resetFile = () => {
    setFileName('');
    setError('');
  };

  return { fileName, error, handleFile, resetFile };
}
