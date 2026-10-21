'use client';

import { File as FileIcon, FolderOpen, FolderKanban, FolderCog } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

type Props = {
  pdfFileName: string;
  destFolder: string;
  onBrowsePdf: () => void;
  onDestFolderChange: (folder: string) => void;
  onBrowseDestFolder: () => void;
  disabled?: boolean;
};

export default function SourceAndDestinationInputs({
  pdfFileName,
  destFolder,
  onBrowsePdf,
  onDestFolderChange,
  onBrowseDestFolder,
  disabled = false,
}: Props) {
  const t = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* PDF Source */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200" htmlFor="pdfPath">
          {t.studio.inputs.pdfPathLabel}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <FileIcon className="w-4 h-4" />
            </span>
            <input
              type="text"
              id="pdfPath"
              readOnly
              value={pdfFileName}
              onClick={!disabled ? onBrowsePdf : undefined}
              placeholder={t.studio.inputs.pdfPathPlaceholder}
              className={[
                'w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all cursor-pointer border',
                'bg-slate-50/80 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20',
                'dark:bg-slate-900/80 dark:border-slate-700/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-500',
                disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-slate-400 dark:hover:border-slate-600',
              ].join(' ')}
            />
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onBrowsePdf}
            className="px-5 py-3 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 hover:bg-slate-200/90 text-slate-700 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 shadow-sm"
          >
            <FolderOpen className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            {t.studio.inputs.browseBtn}
          </button>
        </div>
      </div>

      {/* Destination Folder */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200" htmlFor="destFolder">
          {t.studio.inputs.destFolderLabel}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <FolderKanban className="w-4 h-4" />
            </span>
            <input
              type="text"
              id="destFolder"
              disabled={disabled}
              value={destFolder}
              onChange={(e) => onDestFolderChange(e.target.value)}
              placeholder={t.studio.inputs.destFolderPlaceholder}
              className={[
                'w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all border',
                'bg-slate-50/80 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20',
                'dark:bg-slate-900/80 dark:border-slate-700/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-500',
                disabled ? 'cursor-not-allowed opacity-50' : '',
              ].join(' ')}
            />
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onBrowseDestFolder}
            className="px-5 py-3 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 hover:bg-slate-200/90 text-slate-700 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 shadow-sm"
          >
            <FolderCog className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            {t.studio.inputs.chooseFolderBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
