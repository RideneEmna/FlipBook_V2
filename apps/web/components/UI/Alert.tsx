'use client';

import type { ReactNode } from 'react';

type AlertVariant = 'danger' | 'info';

type Props = {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
};

export default function Alert({ variant = 'danger', children, className = '' }: Props) {
  const variantStyles =
    variant === 'danger'
      ? 'border-danger-border bg-danger-bg text-danger'
      : 'border-surface-border bg-surface-card text-text-base';

  return (
    <div
      role="alert"
      className={`rounded-btn border p-3 text-sm font-medium transition ${variantStyles} ${className}`}
    >
      {children}
    </div>
  );
}
