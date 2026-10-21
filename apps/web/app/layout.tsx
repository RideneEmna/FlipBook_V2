import './globals.css';
import type { ReactNode } from 'react';
import Script from 'next/script';
import Providers from '@/components/Providers';

export const metadata = { title: 'FlipBook Converter' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <head>
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-screen bg-surface-base text-text-base antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


