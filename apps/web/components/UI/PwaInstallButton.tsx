'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaInstallButton() {
  const t = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    if (
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
      }
    } catch (err) {
      console.warn('[PWA] Install prompt error:', err);
    }
  };

  if (isInstalled || !installPrompt) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      title={t.ui.installPwa}
      aria-label={t.ui.installPwa}
      className="inline-flex items-center gap-1.5 rounded-btn border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/20 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <span aria-hidden="true" className="text-sm">📥</span>
      <span>{t.ui.installPwa}</span>
    </button>
  );
}
