'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[SW] Enregistré avec succès :', reg.scope);
          })
          .catch((err) => {
            console.warn('[SW] Erreur enregistrement :', err);
          });
      });
    }
  }, []);

  return null;
}
