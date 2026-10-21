'use client';

import { assetBase, type ConvertedPage } from '@/lib/studioApi';

type Props = {
  jobId: string;
  pages: ConvertedPage[];
};

export default function ConvertedPages({ jobId, pages }: Props) {
  const base = assetBase(jobId);
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {pages.map((page) => (
        <li key={page.pageNumber} className="flex flex-col items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${base}${page.thumbPath}`}
            alt={`Page ${page.pageNumber}`}
            loading="lazy"
            className="w-full rounded border border-surface-border bg-surface-card transition"
          />
          <span className="text-xs text-text-muted">p. {page.pageNumber}</span>
        </li>
      ))}
    </ul>
  );
}

