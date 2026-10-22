'use client';

import { useTranslation } from '@/i18n/useTranslation';
import { Check } from 'lucide-react';

type Props = {
  currentStep?: 1 | 2 | 3;
  maxNavigableStep?: number;
  onStepClick?: (step: 1 | 2 | 3) => void;
  disabled?: boolean;
};

export default function StudioStepper({
  currentStep = 1,
  maxNavigableStep,
  onStepClick,
  disabled = false,
}: Props) {
  const t = useTranslation();

  const steps = [
    {
      num: 1 as const,
      tag: currentStep === 1 ? t.studio.stepper.step1Tag : currentStep > 1 ? t.studio.stepper.doneTag : t.studio.stepper.step2Tag,
      title: t.studio.stepper.step1,
    },
    {
      num: 2 as const,
      tag: currentStep === 2 ? t.studio.stepper.step1Tag : currentStep > 2 ? t.studio.stepper.doneTag : t.studio.stepper.step2Tag,
      title: t.studio.stepper.step2,
    },
    {
      num: 3 as const,
      tag: currentStep === 3 ? t.studio.stepper.step1Tag : t.studio.stepper.step3Tag,
      title: t.studio.stepper.step3,
    },
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-xl transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {steps.map((step) => {
          const isActive = step.num === currentStep;
          const isDone = step.num < currentStep;
          const isClickable =
            !disabled &&
            Boolean(onStepClick) &&
            !isActive &&
            (isDone || (maxNavigableStep !== undefined && step.num <= maxNavigableStep));

          const content = (
            <>
              <div
                className={[
                  'w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm transition shrink-0',
                  isDone
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/50'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                  isClickable && isDone ? 'group-hover:scale-105 group-hover:bg-emerald-600' : '',
                  isClickable && !isDone ? 'group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white' : '',
                ].join(' ')}
              >
                {isDone ? <Check className="w-5 h-5" /> : step.num}
              </div>

              <div className="min-w-0">
                <span
                  className={[
                    'text-xs uppercase tracking-wider font-semibold block truncate',
                    isDone
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400',
                    isClickable ? 'group-hover:underline' : '',
                  ].join(' ')}
                >
                  {step.tag}
                </span>
                <h4
                  className={[
                    'font-semibold text-sm truncate',
                    isDone
                      ? 'text-slate-900 dark:text-white'
                      : isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-700 dark:text-slate-300',
                  ].join(' ')}
                >
                  {step.title}
                </h4>
              </div>
            </>
          );

          const baseClass = [
            'flex items-center gap-4 p-4 rounded-xl transition-all border text-left w-full',
            isDone
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : isActive
              ? 'bg-indigo-50/90 border-indigo-300 dark:bg-indigo-600/20 dark:border-indigo-500/40 shadow-sm'
              : 'bg-slate-100/70 border-slate-200/80 dark:bg-slate-900/40 dark:border-slate-800/80 opacity-70',
          ];

          if (isClickable) {
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => onStepClick?.(step.num)}
                title={`Revenir à l'étape ${step.num} : ${step.title}`}
                aria-label={`Aller à l'étape ${step.num} : ${step.title}`}
                className={[
                  ...baseClass,
                  'group cursor-pointer hover:border-emerald-500/60 hover:bg-emerald-500/20 hover:shadow-md active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                ].join(' ')}
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={step.num}
              aria-current={isActive ? 'step' : undefined}
              className={[
                ...baseClass,
                isActive ? 'cursor-default' : 'cursor-not-allowed',
              ].join(' ')}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
