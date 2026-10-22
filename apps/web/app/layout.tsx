import './globals.css';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import Providers from '@/components/Providers';
import PwaRegister from '@/components/PwaRegister';

export const metadata: Metadata = {
  title: 'Flipbook Studio Pro',
  description: 'Convertisseur et éditeur de Flipbooks interactifs pour l\'éducation',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Studio Pro',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-screen bg-surface-base text-text-base antialiased">
        <PwaRegister />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


