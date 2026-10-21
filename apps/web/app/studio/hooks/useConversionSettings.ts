'use client';

import { useState } from 'react';
import type { ConversionSettings } from '@/components/Studio/ConversionOptions';

/**
 * Gère l'état des paramètres de conversion (DPI, qualité).
 * Responsabilité unique : lire et mettre à jour les settings utilisateur.
 */
export function useConversionSettings() {
  const [settings, setSettings] = useState<ConversionSettings>({
    dpi: 300,
    quality: 85,
  });

  return { settings, setSettings };
}
