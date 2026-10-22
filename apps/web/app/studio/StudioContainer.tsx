'use client';

import { useState } from 'react';
import StudioUploadView from '@/components/Studio/StudioUploadView';
import StudioHeader from '@/components/StudioHeader';
import StudioPageConfigView from '@/components/Studio/StudioPageConfigView';
import StudioFinalConversionView from '@/components/Studio/StudioFinalConversionView';
import type { StudioConfigPage } from '@/components/Studio/page-config/types';
import ConvertedPages from '@/components/Studio/ConvertedPages';
import ProgressBar from '@/components/Studio/ProgressBar';
import { Alert } from '@/components/UI';
import { useTranslation } from '@/i18n/useTranslation';
import {
  useConversionSettings,
  useFileConversion,
  useJobProgress,
} from './hooks';
import type { Phase } from './types';

/**
 * Orchestre les phases du feature Studio :
 * - Step 1: Upload document PDF (idle / error)
 * - Step 2: Configuration des pages (config)
 * - Step 3: Conversion finale (final_conversion)
 */
export default function StudioContainer() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [configuredPages, setConfiguredPages] = useState<StudioConfigPage[]>([]);
  const t = useTranslation();

  const { settings, setSettings } = useConversionSettings();

  const fail = (message: string) => {
    jobProgress.stopWatching();
    setPhase('error');
    fileConversion.resetFile();
    void message;
  };

  const jobProgress = useJobProgress(setPhase, { onFail: fail });

  const fileConversion = useFileConversion({
    settings,
    setPhase,
    onFail: (msg) => {
      jobProgress.stopWatching();
      setPhase('error');
      void msg;
    },
    onUploadSuccess: jobProgress.startWatching,
  });

  const reset = () => {
    jobProgress.resetJob();
    fileConversion.resetFile();
    setUploadedFile(null);
    setConfiguredPages([]);
    setPhase('idle');
  };

  const [initialJsonProject, setInitialJsonProject] = useState<File | null>(null);

  // Step 1 primary submit: moves to Step 2 ("Configuration des pages")
  const handleUploadSubmit = (file: File) => {
    if (uploadedFile && (uploadedFile.name !== file.name || uploadedFile.size !== file.size)) {
      setConfiguredPages([]);
    }
    setUploadedFile(file);
    setInitialJsonProject(null);
    setPhase('config');
  };

  // Step 1 open existing project: moves to Step 2
  const handleOpenProjectJson = (file: File) => {
    setUploadedFile(null);
    setInitialJsonProject(file);
    setConfiguredPages([]);
    setPhase('config');
  };

  // Step 2 proceed to conversion: moves to Phase 3 ("Conversion finale")
  const handleProceedToConversion = (projectData: {
    pages: StudioConfigPage[];
    meta: { title?: string };
  }) => {
    setConfiguredPages(projectData.pages);
    setPhase('final_conversion');
  };

  // Navigate back to upload while preserving existing configured pages
  const handleBackToUpload = (currentPages?: StudioConfigPage[]) => {
    if (currentPages && currentPages.length > 0) {
      setConfiguredPages(currentPages);
    }
    setPhase('idle');
  };

  // Navigate forward to config if already reached
  const handleGoToConfig = () => {
    if (uploadedFile || initialJsonProject) {
      setPhase('config');
    }
  };

  const busy = phase === 'uploading' || phase === 'converting';

  // Step 2: Full Page Configuration View
  if (phase === 'config') {
    return (
      <StudioPageConfigView
        initialPdfFile={uploadedFile}
        initialProjectJsonFile={initialJsonProject}
        persistedPages={configuredPages}
        onProceedToConversion={handleProceedToConversion}
        onBackToUpload={handleBackToUpload}
      />
    );
  }

  // Step 3: Final Conversion Dashboard View
  if (phase === 'final_conversion') {
    return (
      <StudioFinalConversionView
        pages={configuredPages}
        pdfFile={uploadedFile}
        settings={settings}
        onBackToConfig={() => setPhase('config')}
        onBackToUpload={handleBackToUpload}
      />
    );
  }

  return (
    <>
      <StudioHeader />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 relative z-10">
        {/* Global Error Banner */}
        {phase === 'error' && fileConversion.error && (
          <Alert variant="danger">{fileConversion.error}</Alert>
        )}

        {/* 1. Step 1: Upload document PDF */}
        {(phase === 'idle' || phase === 'error') && (
          <StudioUploadView
            settings={settings}
            onSettingsChange={setSettings}
            onSubmit={handleUploadSubmit}
            onOpenProject={handleOpenProjectJson}
            disabled={busy}
            initialFile={uploadedFile}
            canGoToConfig={Boolean((uploadedFile || initialJsonProject) && configuredPages.length > 0)}
            onGoToConfig={handleGoToConfig}
          />
        )}

        {/* 2. Step 3 in progress: Uploading & Converting Phase */}
        {busy && (
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-text-base">
                  📄 {uploadedFile ? uploadedFile.name : fileConversion.fileName || 'Flipbook'}
                </span>
                <span className="text-xs text-text-muted">
                  {settings.dpi} DPI · {progressQuality(settings.quality)}
                </span>
              </div>
              <ProgressBar
                percent={jobProgress.progress.percent}
                step={jobProgress.progress.step}
                message={jobProgress.progress.message}
              />
            </div>
          </section>
        )}

        {/* 3. Step 3 completed: Final Flipbook Compilation Ready */}
        {phase === 'done' && (
          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 rounded-card border border-surface-border bg-surface-card p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-surface-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-text-base">
                  {uploadedFile ? uploadedFile.name : fileConversion.fileName || 'Flipbook Compilé'}
                </h2>
                <p className="text-sm text-text-muted">
                  {jobProgress.pages.length > 0
                    ? t.studio.pagesConverted(jobProgress.pages.length)
                    : 'Compilation terminée avec succès.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPhase('config')}
                  className="rounded-btn border border-surface-border bg-surface-base px-4 py-2 text-sm font-semibold text-text-base transition hover:border-primary hover:text-primary focus:outline-none"
                >
                  Revenir à la configuration
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-btn border border-surface-border bg-surface-base px-4 py-2 text-sm font-semibold text-text-base transition hover:border-primary hover:text-primary focus:outline-none"
                >
                  {t.studio.resetBtn}
                </button>
              </div>
            </div>
            {jobProgress.jobId && jobProgress.pages.length > 0 && (
              <ConvertedPages jobId={jobProgress.jobId} pages={jobProgress.pages} />
            )}
          </div>
        </section>
      )}
    </main>
  </>
);
}

function progressQuality(q: number) {
  return `Qualité ${q}%`;
}
