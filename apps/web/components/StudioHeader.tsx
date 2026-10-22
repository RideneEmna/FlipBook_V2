'use client';

import React from 'react';
import { ThemeToggle, LangToggle, PwaInstallButton } from '@/components/UI';

export default function StudioHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white/80 dark:border-white/5 dark:bg-slate-950/60 px-6 py-3.5 backdrop-blur-md sticky top-0 z-50 transition-colors">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.location.href = '/';
          }}
          className="font-bold text-base text-slate-900 dark:text-white transition hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
          title="Retour à la première étape (Upload)"
        >
          FlipBook Converter
        </a>
        <div className="flex items-center gap-2.5">
          <PwaInstallButton />
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
