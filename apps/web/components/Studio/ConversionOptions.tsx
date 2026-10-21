'use client';

import { useTranslation } from '@/i18n/useTranslation';

export type ConversionSettings = { dpi: number; quality: number };

type Props = {
  value: ConversionSettings;
  onChange: (next: ConversionSettings) => void;
  disabled?: boolean;
};

export default function ConversionOptions({ value, onChange, disabled = false }: Props) {
  const t = useTranslation();

  const dpiChoices = [
    { value: 150, label: t.settings.dpiChoices[150] },
    { value: 200, label: t.settings.dpiChoices[200] },
    { value: 300, label: t.settings.dpiChoices[300] },
  ];

  return (
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm font-medium text-text-base">
        {t.settings.resolution}
        <select
          className="rounded-btn border border-surface-border bg-surface-card px-3 py-2 font-normal text-text-base transition focus:border-primary focus:outline-none"
          value={value.dpi}
          onChange={(e) => onChange({ ...value, dpi: Number(e.target.value) })}
        >
          {dpiChoices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-text-base">
        {t.settings.quality(value.quality)}
        <input
          type="range"
          min={50}
          max={100}
          step={5}
          value={value.quality}
          onChange={(e) => onChange({ ...value, quality: Number(e.target.value) })}
          className="accent-primary"
        />
      </label>
    </fieldset>
  );
}

