'use client';

import { useRef, useState } from 'react';
import { FileText, UploadCloud, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

type Props = {
  onFile: (file: File) => void;
  selectedFile?: File | null;
  disabled?: boolean;
};

export default function UploadDropzone({
  onFile,
  selectedFile = null,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const t = useTranslation();

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
        {t.upload.label}
      </label>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) pick(e.dataTransfer.files);
        }}
        className={[
          'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group relative overflow-hidden',
          dragging
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 scale-[1.01]'
            : selectedFile
            ? 'border-indigo-400 dark:border-indigo-500/60 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'border-slate-300 hover:border-indigo-500 bg-slate-50/70 hover:bg-white dark:border-indigo-500/30 dark:hover:border-indigo-500/60 dark:bg-slate-900/50 dark:hover:bg-slate-900/80',
          disabled ? 'cursor-not-allowed opacity-50' : '',
        ].join(' ')}
      >
        {/* Glow backdrop on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div
            className={[
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform shadow-inner',
              selectedFile
                ? 'bg-indigo-600 text-white group-hover:scale-105 shadow-md shadow-indigo-600/30'
                : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-600/10 dark:text-indigo-400 group-hover:scale-110',
            ].join(' ')}
          >
            {selectedFile ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : (
              <FileText className="w-8 h-8" />
            )}
          </div>

          {selectedFile ? (
            <>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                {selectedFile.name}
              </h3>
              <p className="text-indigo-600 dark:text-indigo-300 text-sm mb-4 font-medium">
                {formatSize(selectedFile.size)} · {t.upload.fileReady}
              </p>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-md hover:bg-indigo-500 transition-colors">
                <UploadCloud className="w-4 h-4" />
                {t.upload.changeBtn}
              </span>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                {t.upload.dragHere}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                {t.upload.supportsPdf}
              </p>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-md hover:bg-indigo-500 transition-colors">
                <UploadCloud className="w-4 h-4" />
                {t.upload.selectBtn}
              </span>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
