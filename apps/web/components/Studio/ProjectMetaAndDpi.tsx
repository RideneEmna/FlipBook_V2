'use client';

import { Sliders, Type as TypeIcon, AlignLeft, Zap, Sparkles, Award } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import type { ConversionSettings } from './ConversionOptions';

type Props = {
  title: string;
  subtitle: string;
  settings: ConversionSettings;
  onTitleChange: (v: string) => void;
  onSubtitleChange: (v: string) => void;
  onSettingsChange: (next: ConversionSettings) => void;
  disabled?: boolean;
};

export default function ProjectMetaAndDpi({
  title,
  subtitle,
  settings,
  onTitleChange,
  onSubtitleChange,
  onSettingsChange,
  disabled = false,
}: Props) {
  const t = useTranslation();

  const resolutions = [
    {
      dpi: 150,
      icon: <Zap className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />,
      label: t.studio.projectMeta.dpiFast,
      subtitle: t.studio.projectMeta.dpiFastDesc,
    },
    {
      dpi: 300,
      icon: <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform" />,
      label: t.studio.projectMeta.dpiHd,
      subtitle: t.studio.projectMeta.dpiHdDesc,
    },
    {
      dpi: 450,
      icon: <Award className="w-4 h-4 text-purple-500 dark:text-purple-400 group-hover:scale-110 transition-transform" />,
      label: t.studio.projectMeta.dpiUltra,
      subtitle: t.studio.projectMeta.dpiUltraDesc,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          {t.studio.projectMeta.sectionTitle}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
          {t.studio.projectMeta.sectionDesc}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Flipbook Title */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200" htmlFor="flipbookTitle">
            {t.studio.projectMeta.titleLabel}
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <TypeIcon className="w-4 h-4" />
            </span>
            <input
              type="text"
              id="flipbookTitle"
              disabled={disabled}
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={t.studio.projectMeta.titlePlaceholder}
              className={[
                'w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all border',
                'bg-slate-50/80 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20',
                'dark:bg-slate-900/80 dark:border-slate-700/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-500',
                disabled ? 'cursor-not-allowed opacity-50' : '',
              ].join(' ')}
            />
          </div>
        </div>

        {/* Flipbook Subtitle */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200" htmlFor="flipbookSubtitle">
            {t.studio.projectMeta.subtitleLabel}
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <AlignLeft className="w-4 h-4" />
            </span>
            <input
              type="text"
              id="flipbookSubtitle"
              disabled={disabled}
              value={subtitle}
              onChange={(e) => onSubtitleChange(e.target.value)}
              placeholder={t.studio.projectMeta.subtitlePlaceholder}
              className={[
                'w-full pl-10 pr-4 py-3 rounded-xl text-sm transition-all border',
                'bg-slate-50/80 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20',
                'dark:bg-slate-900/80 dark:border-slate-700/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-500',
                disabled ? 'cursor-not-allowed opacity-50' : '',
              ].join(' ')}
            />
          </div>
        </div>
      </div>

      {/* Resolution Selection Buttons */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
          {t.studio.projectMeta.resolutionTitle}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {resolutions.map((res) => {
            const isSelected = settings.dpi === res.dpi;

            return (
              <button
                key={res.dpi}
                type="button"
                disabled={disabled}
                onClick={() => onSettingsChange({ ...settings, dpi: res.dpi })}
                className={[
                  'px-4 py-3.5 rounded-xl transition-all flex flex-col items-center gap-1.5 group text-xs sm:text-sm border',
                  isSelected
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-semibold shadow-md shadow-indigo-500/10 dark:bg-indigo-600/20 dark:border-indigo-500 dark:text-white dark:shadow-indigo-600/20 ring-1 ring-indigo-500'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700 font-medium hover:border-indigo-400 hover:text-slate-900 dark:bg-slate-900/80 dark:border-slate-700/60 dark:text-slate-300 dark:hover:text-white',
                  disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95',
                ].join(' ')}
              >
                {res.icon}
                <span className="font-semibold">{res.label}</span>
                <span
                  className={[
                    'text-[10px]',
                    isSelected ? 'text-indigo-600 dark:text-indigo-300 font-medium' : 'text-slate-500 dark:text-slate-400',
                  ].join(' ')}
                >
                  {res.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
