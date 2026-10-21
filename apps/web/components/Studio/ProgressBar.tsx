'use client';

import { useTranslation } from '@/i18n/useTranslation';

type Props = {
  percent: number;
  step: string;
  message: string;
};

export default function ProgressBar({ percent, step, message }: Props) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const t = useTranslation();

  return (
    <div className="rounded-card border border-surface-border bg-surface-card p-4 transition">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-text-base">{step || t.progress.inProgress}</span>
        <span className="tabular-nums text-text-muted">{value} %</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-3 overflow-hidden rounded-full bg-surface-base border border-surface-border"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
      {message ? <p className="mt-2 text-sm text-text-muted">{message}</p> : null}
    </div>
  );
}

