'use client';

import { useRef, useState } from 'react';
import { Sparkles, FolderOpenDot, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import UploadDropzone from './UploadDropzone';
import SourceAndDestinationInputs from './SourceAndDestinationInputs';
import ProjectMetaAndDpi from './ProjectMetaAndDpi';
import type { ConversionSettings } from './ConversionOptions';

type Props = {
  settings: ConversionSettings;
  onSettingsChange: (settings: ConversionSettings) => void;
  onSubmit: (file: File) => void;
  onOpenProject?: (projectFile: File) => void;
  disabled?: boolean;
  initialFile?: File | null;
  canGoToConfig?: boolean;
  onGoToConfig?: () => void;
};

export default function StudioUploadView({
  settings,
  onSettingsChange,
  onSubmit,
  onOpenProject,
  disabled = false,
  initialFile = null,
  canGoToConfig = false,
  onGoToConfig,
}: Props) {
  const t = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(() => initialFile || null);
  const [title, setTitle] = useState(() => {
    if (initialFile) {
      const cleanName = initialFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }
    return '';
  });
  const [subtitle, setSubtitle] = useState('');
  const [destFolder, setDestFolder] = useState('./dist/flipbook-output');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFilePicked = (file: File) => {
    setSelectedFile(file);
    setErrorLocal(null);
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handlePrimarySubmit = () => {
    if (!selectedFile) {
      setErrorLocal(t.studio.actions.noFileError);
      return;
    }
    onSubmit(selectedFile);
  };

  const handleJsonPicked = (files: FileList | null) => {
    const file = files?.[0];
    if (file && onOpenProject) {
      onOpenProject(file);
    }
  };

  return (
    <div className="relative w-full">
      {/* Ambient background blur orbs */}
      <div className="absolute -top-10 left-1/4 w-96 h-96 bg-indigo-300/30 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-10 w-96 h-96 bg-purple-300/25 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-10 w-80 h-80 bg-blue-300/25 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400 text-sm font-semibold shadow-sm transition-colors">
            <Sparkles className="w-4 h-4 animate-pulse text-indigo-500 dark:text-indigo-400" />
            <span>{t.studio.badge}</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-700 dark:from-white dark:via-indigo-200 dark:to-indigo-400 bg-clip-text text-transparent">
            {t.studio.title}
          </h1>

          <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg max-w-2xl mx-auto font-normal">
            {t.studio.subtitle}
          </p>
        </header>



        {/* Local Validation Error Banner */}
        {errorLocal && (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 p-4 text-center text-sm font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300"
          >
            {errorLocal}
          </div>
        )}

        {/* Main Glass Panel */}
        <div className="glass-panel rounded-3xl p-6 md:p-10 shadow-xl glow-effect space-y-8 transition-colors">
          {/* 1. Dropzone */}
          <UploadDropzone
            disabled={disabled}
            selectedFile={selectedFile}
            onFile={handleFilePicked}
          />

          {/* 2. Source & Destination Inputs */}
          <SourceAndDestinationInputs
            disabled={disabled}
            pdfFileName={selectedFile ? selectedFile.name : ''}
            destFolder={destFolder}
            onBrowsePdf={() => fileInputRef.current?.click()}
            onDestFolderChange={setDestFolder}
            onBrowseDestFolder={() => folderInputRef.current?.click()}
          />

          <hr className="border-slate-200 dark:border-slate-800 transition-colors" />

          {/* 3. General Options & Resolution */}
          <ProjectMetaAndDpi
            disabled={disabled}
            title={title}
            subtitle={subtitle}
            settings={settings}
            onTitleChange={setTitle}
            onSubtitleChange={setSubtitle}
            onSettingsChange={onSettingsChange}
          />

          <hr className="border-slate-200 dark:border-slate-800 transition-colors" />

          {/* 4. Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            {/* Secondary Button: Open Project JSON */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => jsonInputRef.current?.click()}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 shadow-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-white dark:border-slate-700/80 dark:shadow-lg text-sm font-semibold transition-all flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-50"
            >
              <FolderOpenDot className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <span>{t.studio.actions.openProject}</span>
            </button>

            {/* Primary Button: Gradient & Glow */}
            <button
              type="button"
              disabled={disabled}
              onClick={handlePrimarySubmit}
              className="w-full sm:w-auto flex-1 max-w-md px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-base font-bold transition-all flex items-center justify-center gap-3 glow-btn active:scale-[0.98] disabled:opacity-50"
            >
              <span>{t.studio.actions.submitPrimary}</span>
              <ArrowRight className="w-5 h-5 rtl:rotate-180 transition-transform" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pt-2 text-slate-500 text-xs">
          <p>{t.studio.footer}</p>
        </footer>
      </div>

      {/* Hidden file pickers */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) handleFilePicked(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          handleJsonPicked(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard across modern browsers
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            const relPath = files[0].webkitRelativePath || '';
            const rootDir = relPath.split('/')[0];
            if (rootDir) setDestFolder(`./${rootDir}`);
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}
