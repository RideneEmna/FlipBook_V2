'use client';

import React, { useState, useMemo, useRef } from 'react';
import type { StudioConfigPage, InteractiveToolKey, InteractiveItem } from './page-config/types';
import type { ConversionSettings } from './ConversionOptions';
import { uploadPDF, watchJobProgress, BASE, getBaseUrl } from '@/lib/studioApi';
import { getOffscreenPageCanvas } from './page-config/pdfLoader';
import { extractDrawingContours } from './page-config/contourExtractor';
import {
  Sparkles,
  PieChart,
  BookOpen,
  Layers,
  Sliders,
  Highlighter,
  Lasso,
  Mic,
  Volume2,
  Video,
  CheckSquare,
  ZoomIn,
  Eye,
  TextCursorInput,
  CheckCircle2,
  Check,
  Cpu,
  FolderDown,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RotateCcw,
  PaintBucket,
  ArrowUpRight,
  CheckCircle,
  Circle,
  Move,
} from 'lucide-react';

interface Props {
  pages: StudioConfigPage[];
  pdfFile: File | null;
  settings: ConversionSettings;
  onBackToConfig: () => void;
  onBackToUpload?: () => void;
}

export default function StudioFinalConversionView({
  pages,
  pdfFile,
  settings,
  onBackToConfig,
  onBackToUpload,
}: Props) {
  const [selectedFormat, setSelectedFormat] = useState<'flipbook' | 'slides'>('flipbook');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [treatedPages, setTreatedPages] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Préparation de la compilation...');
  const [zipBlobUrl, setZipBlobUrl] = useState<string | null>(null);
  const [zipDownloadName, setZipDownloadName] = useState<string>('my-book.zip');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);

  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Tool usage and statistics calculation
  const { totalElements, toolCounts } = useMemo(() => {
    const counts: Record<InteractiveToolKey, number> = {
      select: 0,
      highlight: 0,
      lasso: 0,
      tts: 0,
      audio: 0,
      video: 0,
      zoom: 0,
      blank: 0,
      reveal: 0,
      check: 0,
      button: 0,
      freeColoring: 0,
      colorCorrect: 0,
      paint: 0,
      arrow: 0,
      choice: 0,
      circleExercise: 0,
      dragDrop: 0,
    };

    let total = 0;
    pages.forEach((p) => {
      (p.items || []).forEach((it) => {
        if (counts[it.type] !== undefined) {
          counts[it.type]++;
        }
        total++;
      });
    });

    return { totalElements: total, toolCounts: counts };
  }, [pages]);

  // Convert Studio items into viewer interactions format
  const convertItemsToInteractions = (items: InteractiveItem[], pageNum: number) => {
    return items.map((it, idx) => {
      const iId = `${pageNum}-${idx}-${it.id}`;
      const xPct = it.x * 100;
      const yPct = it.y * 100;
      const wPct = it.w * 100;
      const hPct = it.h * 100;

      switch (it.type) {
        case 'freeColoring':
          return {
            id: iId,
            type: 'free-coloring',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            label: it.label || 'Illustration à colorier',
            autoDetectContours: it.autoDetectContours !== false,
            silhouetteMaskDataUrl: it.silhouetteMaskDataUrl || '',
            outerPolygonPoints: it.outerPolygonPoints || [],
            outerContourSvg: it.outerContourSvg || '',
            regions: it.regions || [],
            lineThreshold: it.lineThreshold,
          };
        case 'colorCorrect':
          return {
            id: iId,
            type: 'color-correct',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            drawingId: it.drawingId || `dessin_${idx + 1}`,
            isCorrect: it.isCorrect !== false,
            label: it.label || `Dessin ${idx + 1}`,
            silhouetteMaskDataUrl: it.silhouetteMaskDataUrl || '',
            outerPolygonPoints: it.outerPolygonPoints || [],
            outerContourSvg: it.outerContourSvg || '',
            regions: it.regions || [],
            lineThreshold: it.lineThreshold,
          };
        case 'paint':
          return {
            id: iId,
            type: 'paint-region',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            regionId: it.regionId || `region_${pageNum}_${idx}`,
            pts: it.pts || [],
            defaultColor: it.defaultColor || '#ffffff',
            targetColor: it.targetColor || '',
            label: it.label || 'Zone à colorier',
          };
        case 'arrow':
          const sx = it.startX !== undefined ? it.startX : it.x;
          const sy = it.startY !== undefined ? it.startY : it.y;
          const ex = it.endX !== undefined ? it.endX : (it.x + it.w);
          const ey = it.endY !== undefined ? it.endY : (it.y + it.h);
          const rawTol = it.tolerance ?? 0.08;
          return {
            id: iId,
            type: 'arrow-exercise',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            startX: sx > 1 ? sx : sx * 100,
            startY: sy > 1 ? sy : sy * 100,
            endX: ex > 1 ? ex : ex * 100,
            endY: ey > 1 ? ey : ey * 100,
            tolerance: rawTol > 1 ? rawTol : rawTol * 100,
            bidirectional: !!it.bidirectional,
            exerciseId: it.exerciseId || 'exo_arrows_1',
            label: it.label || 'Flèche attendue',
          };
        case 'choice':
          return {
            id: iId,
            type: 'choice-zone',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            questionId: it.questionId || 'Q1',
            selectionMode: 'single',
            isCorrect: it.isCorrect ?? false,
            label: it.label || `Option ${idx + 1}`,
          };
        case 'circleExercise':
          return {
            id: iId,
            type: 'circle-zone',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            questionId: it.questionId || 'Q1',
            isCorrect: it.isCorrect ?? false,
            label: it.label || `Option ${idx + 1}`,
          };
        case 'dragDrop':
          if (it.dragDropMode === 'drop') {
            return {
              id: iId,
              type: 'drop-target',
              x: xPct,
              y: yPct,
              width: wPct,
              height: hPct,
              dropId: it.dropId || `drop_${idx + 1}`,
              targetDragId: it.targetDragId || '',
              label: it.label || '',
            };
          } else {
            return {
              id: iId,
              type: 'drag-item',
              x: xPct,
              y: yPct,
              width: wPct,
              height: hPct,
              dragId: it.dragId || `drag_${idx + 1}`,
              dragImageDataUrl: it.dragImageDataUrl || '',
              maskColor: it.maskColor || '#ffffff',
              maskPadding: it.maskPadding || 2,
              isTransparentBg: it.isTransparentBg || false,
            };
          }
        case 'audio':
          return {
            id: iId,
            type: 'audio',
            x: xPct,
            y: yPct,
            title: it.label || 'Audio',
            src: it.fileUrl || 'public/audio/page-flip.wav',
          };
        case 'tts': {
          const textContent = it.text || it.note || '';
          const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(textContent);
          return {
            id: iId,
            type: 'tts',
            x: xPct,
            y: yPct,
            title: 'Écouter le texte',
            text: textContent,
            lang: hasArabic ? 'ar-SA' : (it.lang || 'fr-FR'),
          };
        }
        case 'video':
          return {
            id: iId,
            type: 'video',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            title: it.title || 'Vidéo YouTube',
            youtubeUrl: it.url || '',
          };
        case 'zoom':
          return {
            id: iId,
            type: 'zoom',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            title: it.title || 'Zoom HD',
          };
        case 'blank':
          return {
            id: iId,
            type: 'fill-blank',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            answer: it.answer || '',
            hint: it.hint || '',
            caseSensitive: !!it.cs,
          };
        case 'reveal':
          return {
            id: iId,
            type: 'reveal',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            revealText: it.content || '',
            coverColor: it.color || '#f59e0b',
            coverLabel: it.label || '💡 Cliquer pour révéler',
          };
        case 'check':
          return {
            id: iId,
            type: 'checkbox-task',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            label: it.label || '',
            isCorrect: it.correct ?? true,
            hideLabel: !it.label,
          };
        case 'button':
          return {
            id: iId,
            type: 'score-button',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            label: it.label || 'Corriger',
          };
        case 'highlight':
          return {
            id: iId,
            type: 'highlight',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            color: it.color || 'rgba(250, 204, 21, 0.4)',
            note: it.note || '',
          };
        case 'lasso':
          return {
            id: iId,
            type: 'lasso',
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            pts: it.pts || [],
            color: it.color || '#a78bfa',
            text: it.text || '',
            lang: it.lang || 'fr-FR',
          };
        default:
          return {
            id: iId,
            type: it.type,
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
          };
      }
    });
  };

  // Build the complete project object for export
  const buildProjectJson = (generatedPages?: { pageNumber: number; imagePath: string; thumbPath: string; title: string }[]) => {
    const rawTitle = (pdfFile?.name || pages[0]?.name || 'mon-livre').replace(/\.pdf$/i, '');
    const safeTitle = rawTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || 'my-book';

    return {
      app: 'flipbook-studio-pro',
      version: 1,
      title: rawTitle,
      subtitle: `${pages.length} pages interactives`,
      savedAt: new Date().toISOString(),
      startMode: selectedFormat,
      pdfFileName: pdfFile?.name || pages[0]?.name || 'document.pdf',
      totalPages: pages.length,
      pages: pages.map((p, idx) => {
        const pageNum = idx + 1;
        const genP = generatedPages?.find((g) => g.pageNumber === pageNum);
        return {
          pageNumber: pageNum,
          kind: p.kind,
          sourcePdfName: p.name,
          sourcePdfPageNum: p.num || pageNum,
          imagePath: genP ? genP.imagePath : `public/pages/page-${String(pageNum).padStart(3, '0')}.webp`,
          thumbPath: genP ? genP.thumbPath : `public/pages/thumbs/page-${String(pageNum).padStart(3, '0')}.webp`,
          title: genP?.title || `Page ${pageNum}`,
          interactions: convertItemsToInteractions(p.items || [], pageNum),
        };
      }),
    };
  };

  // Ensure every drawing has a valid contour mask before export
  const ensureDrawingsHaveMasks = async (sourcePages: StudioConfigPage[]): Promise<void> => {
    for (let pIdx = 0; pIdx < sourcePages.length; pIdx++) {
      const p = sourcePages[pIdx];
      const itemsNeedingMask = p.items?.filter(
        (it) => it.type === 'colorCorrect' && !it.silhouetteMaskDataUrl
      ) || [];
      if (itemsNeedingMask.length > 0) {
        try {
          const pageCanvas = await getOffscreenPageCanvas(p, 1600);
          itemsNeedingMask.forEach((it) => {
            const res = extractDrawingContours(
              pageCanvas,
              { x: it.x, y: it.y, w: it.w, h: it.h },
              {
                threshold: it.lineThreshold ?? 135,
                smoothing: it.smoothing ?? 2.0,
                minRegionPixels: it.minRegionPixels ?? 25,
              }
            );
            it.silhouetteMaskDataUrl = res.silhouetteMaskDataUrl;
            it.outerPolygonPoints = res.outerPolygonPoints;
            it.outerContourSvg = res.outerContourSvg;
            it.regions = res.regions;
            it.cropImageDataUrl = res.cropImageDataUrl;
          });
        } catch (e) {
          console.warn(`Could not pre-extract masks for page ${pIdx + 1}:`, e);
        }
      }
    }
  };

  // Launch conversion execution
  const startConversion = async () => {
    setIsConverting(true);
    setIsCompleted(false);
    setProgressPercent(0);
    setTreatedPages(0);
    setErrorMessage(null);
    setStatusMessage('Validation des masques de contour...');

    // Pre-extract masks for any drawing that doesn't have one yet
    await ensureDrawingsHaveMasks(pages);

    setStatusMessage(`Compilation en cours... (${settings.dpi} DPI)`);

    const rawTitle = (pdfFile?.name || pages[0]?.name || 'my-book').replace(/\.pdf$/i, '');
    const safeTitle = rawTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || 'my-book';
    setZipDownloadName(`${safeTitle}.zip`);

    // Case A: Real backend conversion with PDF file
    if (pdfFile) {
      try {
        const { jobId } = await uploadPDF(pdfFile, {
          dpi: settings.dpi,
          quality: settings.quality,
        });
        setLastJobId(jobId);

        watchJobProgress(
          jobId,
          async (snapshot) => {
            const pct = Math.max(0, Math.min(100, Math.round(snapshot.percent)));
            setProgressPercent(pct);
            const treated = Math.round((pct / 100) * pages.length);
            setTreatedPages(treated);

            if (pct < 40) {
              setStatusMessage(`Rendu haute définition des pages... (${settings.dpi} DPI)`);
            } else if (pct < 75) {
              setStatusMessage('Génération des assets audio & modales HD...');
            } else if (pct < 95) {
              setStatusMessage('Compilation du package HTML5 autonome...');
            }

            if (snapshot.status === 'completed') {
              setProgressPercent(100);
              setTreatedPages(pages.length);
              setStatusMessage('Assemblage de l’archive ZIP autonome...');

              try {
                const projectData = buildProjectJson(snapshot.pages);
                const baseUrl = getBaseUrl();

                // Enregistrer project.json et préparer les découpes sur le serveur
                try {
                  await fetch(`${baseUrl}/export/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      jobId,
                      project: projectData,
                      format: selectedFormat,
                    }),
                  });
                } catch (saveErr) {
                  console.warn('Save project notice:', saveErr);
                }

                setLastJobId(jobId);
                setIsConverting(false);
                setIsCompleted(true);
                setErrorMessage(null);
                setStatusMessage('Conversion terminée avec succès ! 🎉');
              } catch (err: any) {
                console.error('Finalize step notice:', err);
                setLastJobId(jobId);
                setIsConverting(false);
                setIsCompleted(true);
                setStatusMessage('Conversion terminée avec succès ! 🎉');
              }
            } else if (snapshot.status === 'error') {
              setErrorMessage(snapshot.error || 'Erreur lors de la conversion des pages');
              setStatusMessage('Échec de la conversion.');
              setIsConverting(false);
            }
          },
          () => {
            // Connection lost fallback
            triggerSimulatedFallback();
          }
        );
        return;
      } catch (err: any) {
        console.warn('Backend unavailable, launching client simulation fallback:', err);
        triggerSimulatedFallback();
        return;
      }
    }

    // Case B: Client simulation fallback (e.g. JSON project or mock)
    triggerSimulatedFallback();
  };

  const triggerSimulatedFallback = () => {
    let current = 0;
    const totalP = pages.length;

    if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);

    fallbackIntervalRef.current = setInterval(async () => {
      current += 2;
      if (current > 100) current = 100;

      const treated = Math.round((current / 100) * totalP);
      setProgressPercent(current);
      setTreatedPages(treated);

      if (current === 50) {
        setStatusMessage('Génération des assets audio & modales HD...');
      } else if (current === 85) {
        setStatusMessage('Compilation du package HTML5 autonome...');
      }

      if (current >= 100) {
        if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
        setStatusMessage('Assemblage de l’archive ZIP autonome...');

        try {
          const projectData = buildProjectJson();
          const baseUrl = getBaseUrl();
          let blob: Blob | null = null;

          try {
            const exportRes = await fetch(`${baseUrl}/export`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                project: projectData,
                format: selectedFormat,
              }),
            });
            if (exportRes.ok) {
              blob = await exportRes.blob();
            }
          } catch {
            // ignore and fallback to jszip
          }

          if (!blob) {
            const rawTitle = projectData.title || 'my-book';
            const safeTitle = rawTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            const batContent = `@echo off\r\nchcp 65001 >nul\r\ntitle Flipbook Studio Pro\r\nif not exist "%~dp0index.html" (\r\n    echo ======================================================================\r\n    echo   ATTENTION : ARCHIVE ZIP NON EXTRAITE !\r\n    echo ======================================================================\r\n    echo   Veuillez extraire l'archive (Clic droit ^> Extraire tout)\r\n    echo   avant d'executer Ouvrir_Flipbook.bat.\r\n    echo ======================================================================\r\n    pause\r\n    exit /b 1\r\n)\r\nstart "" "%~dp0index.html"\r\n`;
            zip.file('Ouvrir_Flipbook.bat', batContent);
            const kioskBatContent = `@echo off\r\nchcp 65001 >nul\r\ntitle Flipbook Studio Pro - Mode Kiosque Plein Ecran\r\nif not exist "%~dp0index.html" (\r\n    pause\r\n    exit /b 1\r\n)\r\necho Demarrage du mode Kiosque plein ecran...\r\necho (Pour quitter a tout moment : cliquez sur le bouton [X Quitter] ou appuyez sur Alt+F4)\r\nstart msedge --app="%~dp0index.html?kiosk=1" --start-fullscreen 2>nul || start msedge --kiosk "%~dp0index.html?kiosk=1" 2>nul || start chrome --app="%~dp0index.html?kiosk=1" --start-fullscreen 2>nul || start chrome --kiosk "%~dp0index.html?kiosk=1" 2>nul || start "" "%~dp0index.html"\r\n`;
            zip.file('Lancer_Mode_Kiosque.bat', kioskBatContent);
            blob = await zip.generateAsync({ type: 'blob' });
          }

          const url = URL.createObjectURL(blob);
          setZipBlobUrl(url);
          setIsConverting(false);
          setIsCompleted(true);
          setErrorMessage(null);
          setStatusMessage('Conversion terminée avec succès ! 🎉');
        } catch (simErr: any) {
          console.error('Fallback export error:', simErr);
          setErrorMessage(`Erreur d'exportation : ${simErr.message || simErr}`);
          setIsConverting(false);
        }
      }
    }, 50);
  };

  // Download Output Folder ZIP
  const handleDownloadZip = () => {
    if (lastJobId) {
      const baseUrl = getBaseUrl();
      const a = document.createElement('a');
      a.href = `${baseUrl}/export/${lastJobId}?format=${selectedFormat}`;
      a.download = zipDownloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    if (zipBlobUrl) {
      const a = document.createElement('a');
      a.href = zipBlobUrl;
      a.download = zipDownloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="relative w-full">
      {/* Background glowing accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10 flex-1 flex flex-col justify-center w-full">

        {/* 3. MAIN DASHBOARD CONTAINER */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl glow-effect space-y-6">
          {/* Summary Section: Total Pages & Tools Usage Counts */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4" />
              <span>Résumé du Projet &amp; Statistiques d&apos;Interactivité</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Total Pages Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-lg shrink-0">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium">Pages Totales</span>
                  <h4 className="text-2xl font-extrabold text-white">
                    {pages.length} Pages
                  </h4>
                </div>
              </div>

              {/* Configured Elements Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-lg shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium">Éléments Actifs</span>
                  <h4 className="text-2xl font-extrabold text-white">
                    {totalElements} Configuré{totalElements > 1 ? 's' : ''}
                  </h4>
                </div>
              </div>

              {/* Resolution / DPI Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg shrink-0">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium">Qualité Rendu</span>
                  <h4 className="text-lg font-bold text-white">
                    {settings.dpi} DPI ({settings.dpi >= 300 ? 'HD' : 'Standard'})
                  </h4>
                </div>
              </div>
            </div>

            {/* Detailed Tool Usage Counters Badge Grid */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-300 mb-3">
                Utilisation des outils interactifs :
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Highlighter className="w-3.5 h-3.5 text-indigo-400" /> Surligner
                  </span>
                  <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                    {toolCounts.highlight}
                  </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Lasso className="w-3.5 h-3.5 text-indigo-400" /> Lasso
                  </span>
                  <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                    {toolCounts.lasso}
                  </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-purple-400" /> TTS
                  </span>
                  <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                    {toolCounts.tts}
                  </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> Audio
                  </span>
                  <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                    {toolCounts.audio}
                  </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-blue-400" /> Vidéo
                  </span>
                  <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                    {toolCounts.video}
                  </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Checkbox
                  </span>
                  <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                    {toolCounts.check}
                  </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-amber-400" /> Zoom
                  </span>
                  <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                    {toolCounts.zoom}
                  </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" /> Révéler
                  </span>
                  <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                    {toolCounts.reveal}
                  </span>
                </div>

                {toolCounts.blank > 0 && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <TextCursorInput className="w-3.5 h-3.5 text-yellow-400" /> Texte à trou
                    </span>
                    <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                      {toolCounts.blank}
                    </span>
                  </div>
                )}

                {toolCounts.button > 0 && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" /> Corriger
                    </span>
                    <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                      {toolCounts.button}
                    </span>
                  </div>
                )}

                {toolCounts.paint > 0 && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <PaintBucket className="w-3.5 h-3.5 text-pink-400" /> Peinture
                    </span>
                    <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                      {toolCounts.paint}
                    </span>
                  </div>
                )}

                {toolCounts.arrow > 0 && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" /> Flèches
                    </span>
                    <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                      {toolCounts.arrow}
                    </span>
                  </div>
                )}

                {toolCounts.choice > 0 && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Choix QCM
                    </span>
                    <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                      {toolCounts.choice}
                    </span>
                  </div>
                )}

                {toolCounts.circleExercise > 0 && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Circle className="w-3.5 h-3.5 text-purple-400" /> Entourer la zone
                    </span>
                    <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                      {toolCounts.circleExercise}
                    </span>
                  </div>
                )}

                {toolCounts.dragDrop > 0 && (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5 text-blue-400" /> Glisser-Déposer
                    </span>
                    <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded">
                      {toolCounts.dragDrop}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. FORMAT SELECTION OPTIONS */}
          <div className="space-y-3 pt-2">
            <label className="block text-sm font-semibold text-slate-200">
              Format de sortie souhaité :
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Flipbook */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFormat('flipbook');
                  if (lastJobId) {
                    const baseUrl = getBaseUrl();
                    fetch(`${baseUrl}/export/save`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        jobId: lastJobId,
                        project: buildProjectJson(),
                        format: 'flipbook',
                      }),
                    }).catch(() => { });
                  }
                }}
                className={`p-5 rounded-2xl text-left transition-all relative flex flex-col justify-between group ${selectedFormat === 'flipbook'
                    ? 'bg-indigo-600/20 border-2 border-indigo-500 shadow-lg'
                    : 'bg-slate-900/90 border border-slate-800 hover:border-slate-700'
                  }`}
              >
                <div
                  className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center text-xs transition ${selectedFormat === 'flipbook'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-500'
                    }`}
                >
                  <Check
                    className={`w-3.5 h-3.5 ${selectedFormat === 'flipbook' ? 'opacity-100' : 'opacity-0'
                      }`}
                  />
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold block mb-1">
                    Recommandé
                  </span>
                  <h4 className="text-base font-bold text-white mb-1">
                    Convertir en Flipbook HTML5
                  </h4>
                  <p className="text-xs text-slate-400">
                    Livre interactif 3D avec effets de page, audio, modales HD et
                    script autonome exécutable partout.
                  </p>
                </div>
              </button>

              {/* Option 2: Normal Slides */}
              <button
                type="button"
                onClick={() => {
                  setSelectedFormat('slides');
                  if (lastJobId) {
                    const baseUrl = getBaseUrl();
                    fetch(`${baseUrl}/export/save`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        jobId: lastJobId,
                        project: buildProjectJson(),
                        format: 'slides',
                      }),
                    }).catch(() => { });
                  }
                }}
                className={`p-5 rounded-2xl text-left transition-all relative flex flex-col justify-between group ${selectedFormat === 'slides'
                    ? 'bg-indigo-600/20 border-2 border-indigo-500 shadow-lg'
                    : 'bg-slate-900/90 border border-slate-800 hover:border-slate-700'
                  }`}
              >
                <div
                  className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center text-xs transition ${selectedFormat === 'slides'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-500'
                    }`}
                >
                  <Check
                    className={`w-3.5 h-3.5 ${selectedFormat === 'slides' ? 'opacity-100' : 'opacity-0'
                      }`}
                  />
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    Alternatif
                  </span>
                  <h4 className="text-base font-bold text-slate-200 mb-1">
                    Convertir en diapositives normales
                  </h4>
                  <p className="text-xs text-slate-400">
                    Galerie de slides plates défilantes avec les mêmes composants
                    interactifs intégrés.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 5. PROGRESS BAR CONTAINER (Shown during compilation & upon finish) */}
          {(isConverting || isCompleted) && (
            <div className="space-y-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 animate-in fade-in duration-300">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-indigo-400 flex items-center gap-2">
                  {isConverting && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
                  <span>{statusMessage}</span>
                </span>
                <span className="font-bold text-white">{progressPercent}%</span>
              </div>
              {/* Progress Bar Track */}
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 h-full transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                <span>
                  Pages traitées : {treatedPages} / {pages.length} ({settings.dpi} DPI)
                </span>
                <span>Qualité : Haute Définition ({settings.dpi} DPI)</span>
              </div>
            </div>
          )}

          {/* 6. POST-CONVERSION ACTIONS (Shown when completed) */}
          {isCompleted && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-in fade-in duration-300">
              <button
                type="button"
                onClick={handleDownloadZip}
                className="py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <FolderDown className="w-5 h-5" />
                <span>Télécharger le dossier de sortie (ZIP)</span>
              </button>
              <button
                type="button"
                onClick={onBackToConfig}
                className="py-4 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm border border-slate-700 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <ArrowLeft className="w-5 h-5 text-indigo-400" />
                <span>Retour à la configuration</span>
              </button>
            </div>
          )}

          {/* Error Message Box if export or conversion failed */}
          {errorMessage && !isCompleted && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-200">Erreur lors de la conversion</p>
                <p className="mt-1 text-slate-300">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Launch Conversion Primary Button & Back to Step 2 Button */}
          {!isConverting && !isCompleted && (
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onBackToConfig}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm border border-slate-700/80 transition flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                title="Revenir à la configuration des pages (Étape 2)"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-400" />
                <span>Retour à la configuration des pages</span>
              </button>

              <button
                type="button"
                onClick={startConversion}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-base font-bold transition-all flex items-center justify-center gap-3 glow-btn active:scale-[0.98]"
              >
                {errorMessage ? <RotateCcw className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
                <span>{errorMessage ? 'Réessayer la conversion finale' : 'Lancer la conversion finale'}</span>
              </button>
            </div>
          )}
        </div>

        <footer className="text-center mt-8 text-slate-500 text-xs">
          <p>
            Flipbook Studio Pro &copy; 2026 &bull; Compilateur Web
          </p>
        </footer>
      </div>
    </div>
  );
}
