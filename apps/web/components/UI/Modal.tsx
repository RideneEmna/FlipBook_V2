'use client';

import { useEffect, type ReactNode } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export default function Modal({ isOpen, onClose, title, children }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg rounded-card border border-surface-border bg-surface-card p-6 shadow-xl transition">
        {title && (
          <div className="mb-4 flex items-center justify-between border-b border-surface-border pb-3">
            <h2 id="modal-title" className="text-lg font-semibold text-text-base">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-btn p-1 text-text-muted transition hover:bg-surface-base hover:text-text-base focus:outline-none"
            >
              ✕
            </button>
          </div>
        )}
        <div className="text-text-base">{children}</div>
      </div>
    </div>
  );
}
