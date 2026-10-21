'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sliders, Trash2, Volume2, Pause, Play, Square, Circle, AlertTriangle, CheckCircle2, Move } from 'lucide-react';
import { TOOL_DEFS, type StudioConfigPage, type InteractiveItem } from './types';
import DrawingContourInspector from './DrawingContourInspector';
import { getOffscreenPageCanvas } from './pdfLoader';

const TTS_LANGUAGES = [
  { code: 'fr-FR', label: 'Français' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Español' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'ar-SA', label: 'العربية' },
];

interface Props {
  page: StudioConfigPage;
  pageNumber: number;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (id: string, updates: Partial<InteractiveItem>) => void;
  onDeleteItem: (id: string) => void;
}

export default function PageConfigPanel({
  page,
  pageNumber,
  selectedItemId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
}: Props) {
  const selectedItem = page.items.find((i) => i.id === selectedItemId);

  // TTS testing state
  const [testAudioState, setTestAudioState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeTestMode = useRef<'audio' | 'speech' | null>(null);

  // Stop any active TTS audio when selection changes or unmounts
  useEffect(() => {
    return () => {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current.currentTime = 0;
        testAudioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setTestAudioState('idle');
      activeTestMode.current = null;
    };
  }, [selectedItemId]);

  const handleStopTTS = () => {
    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current.currentTime = 0;
      testAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setTestAudioState('idle');
    activeTestMode.current = null;
  };

  const handlePauseTTS = () => {
    if (activeTestMode.current === 'audio' && testAudioRef.current) {
      testAudioRef.current.pause();
      setTestAudioState('paused');
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setTestAudioState('paused');
    }
  };

  const handleResumeTTS = () => {
    if (activeTestMode.current === 'audio' && testAudioRef.current) {
      testAudioRef.current.play().catch(() => {});
      setTestAudioState('playing');
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      setTestAudioState('playing');
    }
  };

  const handleStartTTS = (text: string, lang: string, rate: number = 1) => {
    const cleanText = (text || '').trim();
    if (!cleanText) return;

    handleStopTTS();

    const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(cleanText);
    const targetLang = (hasArabic || lang === 'ar-SA' || (lang && lang.startsWith('ar'))) ? 'ar-SA' : (lang || 'fr-FR');

    if (hasArabic || targetLang.startsWith('ar')) {
      activeTestMode.current = 'audio';
      setTestAudioState('playing');
      const chunk = cleanText.slice(0, 180);
      const audio = new Audio(`/api/tts?tl=ar&text=${encodeURIComponent(chunk)}`);
      testAudioRef.current = audio;

      audio.onended = () => {
        setTestAudioState('idle');
        testAudioRef.current = null;
      };
      audio.onerror = () => {
        // Fallback to direct stream with referrerPolicy
        const directAudio = document.createElement('audio');
        (directAudio as any).referrerPolicy = 'no-referrer';
        directAudio.src = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encodeURIComponent(chunk)}`;
        testAudioRef.current = directAudio;
        directAudio.onended = () => {
          setTestAudioState('idle');
          testAudioRef.current = null;
        };
        directAudio.onerror = () => {
          if ('speechSynthesis' in window) {
            activeTestMode.current = 'speech';
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(cleanText);
            u.lang = 'ar-SA';
            u.rate = rate;
            u.onend = () => setTestAudioState('idle');
            u.onerror = () => setTestAudioState('idle');
            window.speechSynthesis.speak(u);
          } else {
            setTestAudioState('idle');
          }
        };
        directAudio.play().catch(() => {
          if ('speechSynthesis' in window) {
            activeTestMode.current = 'speech';
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(cleanText);
            u.lang = 'ar-SA';
            u.rate = rate;
            u.onend = () => setTestAudioState('idle');
            u.onerror = () => setTestAudioState('idle');
            window.speechSynthesis.speak(u);
          } else {
            setTestAudioState('idle');
          }
        });
      };
      audio.play().catch(() => {
        audio.dispatchEvent(new Event('error'));
      });
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      activeTestMode.current = 'speech';
      window.speechSynthesis.cancel();
      if (typeof window.speechSynthesis.resume === 'function') {
        window.speechSynthesis.resume();
      }
      const u = new SpeechSynthesisUtterance(cleanText);
      u.lang = targetLang;
      u.rate = rate;

      if ('getVoices' in window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        const exactVoice = voices.find(
          (v) => v.lang && v.lang.replace('_', '-').toLowerCase() === targetLang.toLowerCase()
        );
        const prefixVoice = voices.find(
          (v) => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith(targetLang.split('-')[0].toLowerCase())
        );
        const matched = exactVoice || prefixVoice;
        if (matched) u.voice = matched;
      }

      u.onend = () => {
        setTestAudioState('idle');
      };
      u.onerror = () => {
        setTestAudioState('idle');
      };

      setTestAudioState('playing');
      window.speechSynthesis.speak(u);
    }
  };

  const getSummary = (it: InteractiveItem) => {
    if (it.type === 'freeColoring') {
      return `🎨 Coloriage: ${it.label || 'Illustration'}`;
    }
    if (it.type === 'colorCorrect') {
      return `🎯 [${it.drawingId || 'Dessin'}] ${it.label || ''} (${it.isCorrect ? '✓' : '✗'})`;
    }
    if (it.type === 'paint') {
      return `🎨 ${it.label || it.regionId || 'Zone à colorier'}`;
    }
    if (it.type === 'arrow') {
      return `↗ ${it.label || 'Flèche'} (${Math.round((it.tolerance || 0.08) * 100)}% tol${it.bidirectional ? ', ↔' : ''})`;
    }
    if (it.type === 'choice') {
      return `[${it.questionId || 'Q1'}] ${it.label || 'Option'} (${it.isCorrect ? '✓ Vrai' : '✗ Faux'})`;
    }
    if (it.type === 'circleExercise') {
      return `⭕ [${it.questionId || 'Q1'}] ${it.label || 'Option'} (${it.isCorrect ? '✓ Vrai' : '✗ Faux'})`;
    }
    if (it.type === 'dragDrop') {
      return (it.dragDropMode || 'drag') === 'drag'
        ? `✋ Élément: [${it.dragId || 'drag'}]`
        : `🎯 Cible: [${it.dropId || 'drop'}] → ${it.targetDragId || 'non associé'}`;
    }
    return (
      it.label ||
      it.title ||
      it.text ||
      it.answer ||
      it.content ||
      it.note ||
      it.url ||
      ''
    );
  };

  const handleFileUpload = (
    it: InteractiveItem,
    field: 'fileUrl' | 'fileName',
    files: FileList | null
  ) => {
    const file = files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onUpdateItem(it.id, {
        fileName: file.name,
        fileUrl: url,
      });
    }
  };

  const handleRecaptureDragItem = async (item: InteractiveItem, forceTransparent?: boolean) => {
    try {
      const canvas = await getOffscreenPageCanvas(page, 1600);
      const sx = Math.max(0, Math.floor(item.x * canvas.width));
      const sy = Math.max(0, Math.floor(item.y * canvas.height));
      const sw = Math.min(canvas.width - sx, Math.max(1, Math.floor(item.w * canvas.width)));
      const sh = Math.min(canvas.height - sy, Math.max(1, Math.floor(item.h * canvas.height)));

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = sw;
      cropCanvas.height = sh;
      const ctx = cropCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

        const shouldTransparent = forceTransparent !== undefined ? forceTransparent : item.isTransparentBg;
        let cropDataUrl = cropCanvas.toDataURL('image/png');

        if (shouldTransparent) {
          const imgData = ctx.getImageData(0, 0, sw, sh);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 238 && g > 238 && b > 238) {
              data[i + 3] = 0;
            }
          }
          ctx.putImageData(imgData, 0, 0);
          cropDataUrl = cropCanvas.toDataURL('image/png');
        }

        onUpdateItem(item.id, { dragImageDataUrl: cropDataUrl });
      }
    } catch (err) {
      console.warn('Recapture drag item failed:', err);
    }
  };

  const handleToggleTransparentBg = (item: InteractiveItem) => {
    const nextVal = !item.isTransparentBg;
    onUpdateItem(item.id, { isTransparentBg: nextVal });
    handleRecaptureDragItem(item, nextVal);
  };

  return (
    <aside className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 lg:max-h-[calc(60vh+90px)] overflow-y-auto custom-scrollbar flex flex-col gap-4">
      {/* Panel Header */}
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <span>Configuration de la page</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Page {pageNumber} · {page.items.length} élément{page.items.length > 1 ? 's' : ''}{' '}
          configuré{page.items.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Item List */}
      <div className="space-y-1.5">
        {page.items.length === 0 ? (
          <div className="text-xs text-slate-500 border border-dashed border-slate-700 rounded-xl p-4 text-center">
            Choisissez un outil dans la barre, puis dessinez directement sur la page.
          </div>
        ) : (
          page.items.map((it) => {
            const def = TOOL_DEFS[it.type];
            const isSelected = it.id === selectedItemId;
            const summary = getSummary(it);

            return (
              <div
                key={it.id}
                onClick={() => onSelectItem(it.id)}
                className={[
                  'flex items-center gap-2 rounded-lg px-2.5 py-2 border cursor-pointer transition-all',
                  isSelected
                    ? 'bg-indigo-600/25 border-indigo-500 shadow-sm'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-600',
                ].join(' ')}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-none"
                  style={{ backgroundColor: it.color || def?.c }}
                />
                <span className="text-xs font-semibold text-slate-200">
                  {def?.n || it.type}
                </span>
                <span className="text-xs text-slate-400 truncate flex-1">
                  {summary ? summary.slice(0, 24) : ''}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(it.id);
                  }}
                  className="text-slate-500 hover:text-red-400 p-1 rounded transition"
                  title="Supprimer cet élément"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Item Configuration Form */}
      <div className="border-t border-slate-800 pt-4 space-y-4">
        {!selectedItem ? (
          <p className="text-xs text-slate-500 italic">
            Sélectionnez un élément pour modifier ses réglages.
          </p>
        ) : (
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white mb-4">
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    selectedItem.color || TOOL_DEFS[selectedItem.type]?.c,
                }}
              />
              <span>{TOOL_DEFS[selectedItem.type]?.n}</span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Highlight Fields */}
              {selectedItem.type === 'highlight' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Couleur du surlignage
                    </label>
                    <input
                      type="color"
                      value={selectedItem.color || '#facc15'}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { color: e.target.value })
                      }
                      className="w-full h-9 rounded-lg bg-slate-900/80 border border-slate-700/60 p-1 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Note affichée au survol
                    </label>
                    <input
                      type="text"
                      value={selectedItem.note || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { note: e.target.value })
                      }
                      placeholder="Note ou explication..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              {/* Lasso Fields */}
              {selectedItem.type === 'lasso' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Texte du paragraphe
                    </label>
                    <textarea
                      rows={4}
                      value={selectedItem.text || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { text: e.target.value })
                      }
                      placeholder="Texte à lire..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Couleur
                    </label>
                    <input
                      type="color"
                      value={selectedItem.color || '#a78bfa'}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { color: e.target.value })
                      }
                      className="w-full h-9 rounded-lg bg-slate-900/80 border border-slate-700/60 p-1 cursor-pointer"
                    />
                  </div>
                  <label className="flex items-center gap-2 font-semibold text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={selectedItem.read !== false}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { read: e.target.checked })
                      }
                      className="accent-indigo-500 w-4 h-4 rounded"
                    />
                    <span>Lire à voix haute au clic</span>
                  </label>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Langue de lecture
                    </label>
                    <select
                      value={selectedItem.lang || 'fr-FR'}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { lang: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      {TTS_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* TTS Fields */}
              {selectedItem.type === 'tts' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Texte à lire
                    </label>
                    <textarea
                      rows={4}
                      value={selectedItem.text || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { text: e.target.value })
                      }
                      placeholder="Texte lu par la synthèse vocale..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Langue
                    </label>
                    <select
                      value={selectedItem.lang || 'fr-FR'}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { lang: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      {TTS_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Vitesse de lecture
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.6"
                        max="1.6"
                        step="0.1"
                        value={selectedItem.rate ?? 1}
                        onChange={(e) =>
                          onUpdateItem(selectedItem.id, {
                            rate: parseFloat(e.target.value),
                          })
                        }
                        className="flex-1 accent-indigo-500"
                      />
                      <span className="text-slate-400 w-8">
                        {selectedItem.rate ?? 1}x
                      </span>
                    </div>
                  </div>
                  <div>
                    {testAudioState === 'idle' ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleStartTTS(
                            selectedItem.text || '',
                            selectedItem.lang || 'fr-FR',
                            selectedItem.rate ?? 1
                          )
                        }
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600/30 border border-indigo-500/50 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold transition active:scale-[0.98]"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Tester la prononciation</span>
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] px-1 font-medium">
                          {testAudioState === 'playing' ? (
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Lecture en cours...
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-amber-400">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              En pause
                            </span>
                          )}
                          <span className="text-slate-400 text-[10px]">
                            {selectedItem.lang || 'fr-FR'} • {selectedItem.rate ?? 1}x
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {testAudioState === 'playing' ? (
                            <button
                              type="button"
                              onClick={handlePauseTTS}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold transition active:scale-[0.98]"
                              title="Mettre la lecture en pause"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>Pause</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleResumeTTS}
                              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-200 text-xs font-semibold transition active:scale-[0.98]"
                              title="Reprendre la lecture"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Reprendre</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleStopTTS}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/20 border border-rose-500/50 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold transition active:scale-[0.98]"
                            title="Arrêter la lecture"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>Arrêter</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Audio Fields */}
              {selectedItem.type === 'audio' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Libellé
                    </label>
                    <input
                      type="text"
                      value={selectedItem.label || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { label: e.target.value })
                      }
                      placeholder="Piste audio 1..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Piste audio
                    </label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) =>
                        handleFileUpload(selectedItem, 'fileUrl', e.target.files)
                      }
                      className="block w-full text-xs text-slate-400 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200 file:font-semibold"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      {selectedItem.fileName || 'Aucun fichier sélectionné'}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 font-semibold text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={!!selectedItem.autoplay}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, {
                          autoplay: e.target.checked,
                        })
                      }
                      className="accent-indigo-500 w-4 h-4 rounded"
                    />
                    <span>Lecture automatique à l'ouverture de la page</span>
                  </label>
                </>
              )}

              {/* Video Fields */}
              {selectedItem.type === 'video' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Titre de la vidéo
                    </label>
                    <input
                      type="text"
                      value={selectedItem.title || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { title: e.target.value })
                      }
                      placeholder="Vidéo démonstration..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      URL directe (.mp4)
                    </label>
                    <input
                      type="text"
                      value={selectedItem.url || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { url: e.target.value })
                      }
                      placeholder="https://example.com/video.mp4"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      ou fichier vidéo
                    </label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) =>
                        handleFileUpload(selectedItem, 'fileUrl', e.target.files)
                      }
                      className="block w-full text-xs text-slate-400 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-200 file:font-semibold"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      {selectedItem.fileName || 'Aucun fichier sélectionné'}
                    </p>
                  </div>
                </>
              )}

              {/* Zoom Fields */}
              {selectedItem.type === 'zoom' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Titre de la modale
                    </label>
                    <input
                      type="text"
                      value={selectedItem.title || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { title: e.target.value })
                      }
                      placeholder="Détail haute résolution..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Niveau de zoom
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1.5"
                        max="4"
                        step="0.5"
                        value={selectedItem.level ?? 2.5}
                        onChange={(e) =>
                          onUpdateItem(selectedItem.id, {
                            level: parseFloat(e.target.value),
                          })
                        }
                        className="flex-1 accent-indigo-500"
                      />
                      <span className="text-slate-400 w-8">
                        {selectedItem.level ?? 2.5}x
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Blank Fields */}
              {selectedItem.type === 'blank' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Réponse attendue
                    </label>
                    <input
                      type="text"
                      value={selectedItem.answer || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { answer: e.target.value })
                      }
                      placeholder="Mot attendu..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Indice
                    </label>
                    <input
                      type="text"
                      value={selectedItem.hint || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { hint: e.target.value })
                      }
                      placeholder="Indice ou début du mot..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <label className="flex items-center gap-2 font-semibold text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={!!selectedItem.cs}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { cs: e.target.checked })
                      }
                      className="accent-indigo-500 w-4 h-4 rounded"
                    />
                    <span>Sensible à la casse (majuscules/minuscules)</span>
                  </label>
                </>
              )}

              {/* Reveal Fields */}
              {selectedItem.type === 'reveal' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Contenu révélé au clic
                    </label>
                    <textarea
                      rows={3}
                      value={selectedItem.content || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { content: e.target.value })
                      }
                      placeholder="Texte caché sous le masque..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Couleur du masque
                    </label>
                    <input
                      type="color"
                      value={selectedItem.color || '#6366f1'}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { color: e.target.value })
                      }
                      className="w-full h-9 rounded-lg bg-slate-900/80 border border-slate-700/60 p-1 cursor-pointer"
                    />
                  </div>
                </>
              )}

              {/* Check Fields */}
              {selectedItem.type === 'check' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Libellé (optionnel)
                    </label>
                    <input
                      type="text"
                      value={selectedItem.label || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { label: e.target.value })
                      }
                      placeholder="Texte à droite de la case (optionnel)..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Dimensions de la case (% de la page)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1">Largeur : {Math.round(selectedItem.w * 100)}%</span>
                        <input
                          type="range"
                          min="1"
                          max="25"
                          step="0.5"
                          value={Math.round(selectedItem.w * 1000) / 10}
                          onChange={(e) =>
                            onUpdateItem(selectedItem.id, { w: parseFloat(e.target.value) / 100 })
                          }
                          className="w-full accent-teal-500"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1">Hauteur : {Math.round(selectedItem.h * 100)}%</span>
                        <input
                          type="range"
                          min="1"
                          max="25"
                          step="0.5"
                          value={Math.round(selectedItem.h * 1000) / 10}
                          onChange={(e) =>
                            onUpdateItem(selectedItem.id, { h: parseFloat(e.target.value) / 100 })
                          }
                          className="w-full accent-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Tailles rapides :</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { label: 'Petite', w: 0.025, h: 0.025 },
                        { label: 'Moyenne', w: 0.04, h: 0.035 },
                        { label: 'Grande', w: 0.06, h: 0.05 },
                        { label: 'Très grande', w: 0.08, h: 0.07 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => onUpdateItem(selectedItem.id, { w: preset.w, h: preset.h })}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 font-semibold text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={selectedItem.correct !== false}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { correct: e.target.checked })
                      }
                      className="accent-teal-500 w-4 h-4 rounded"
                    />
                    <span>Cette case doit être cochée (bonne réponse)</span>
                  </label>
                </>
              )}

              {/* Button Fields */}
              {selectedItem.type === 'button' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Libellé du bouton
                  </label>
                  <input
                    type="text"
                    value={selectedItem.label || 'Corriger'}
                    onChange={(e) =>
                      onUpdateItem(selectedItem.id, { label: e.target.value })
                    }
                    placeholder="Corriger..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Feature 1 — Free Coloring Fields */}
              {selectedItem.type === 'freeColoring' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Libellé de l'illustration
                    </label>
                    <input
                      type="text"
                      value={selectedItem.label || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { label: e.target.value })
                      }
                      placeholder="Ex: Maison, Jardin, Arbre..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Couleur de repère dans l'éditeur
                    </label>
                    <input
                      type="color"
                      value={selectedItem.color || '#ec4899'}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { color: e.target.value })
                      }
                      className="w-full h-9 rounded-lg bg-slate-900/80 border border-slate-700/60 p-1 cursor-pointer"
                    />
                  </div>

                  {/* High-Resolution Contour & Region Inspector */}
                  <DrawingContourInspector
                    page={page}
                    item={selectedItem}
                    onUpdateItem={onUpdateItem}
                  />

                  <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs text-pink-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <span>🎨</span> Coloriage libre au pot de peinture
                    </p>
                    <p className="text-slate-300">
                      Les zones fermées détectées à l'intérieur de ce dessin sont colorables individuellement par les élèves sans déborder sur les contours noirs.
                    </p>
                  </div>
                </>
              )}

              {/* Feature 2 — Color the Correct Drawings Fields */}
              {selectedItem.type === 'colorCorrect' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Libellé du dessin
                    </label>
                    <input
                      type="text"
                      value={selectedItem.label || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { label: e.target.value })
                      }
                      placeholder="Ex: Chat, Écureuil, Poisson..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Identifiant du dessin (Groupe ID)
                    </label>
                    <input
                      type="text"
                      value={selectedItem.drawingId || 'dessin_1'}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { drawingId: e.target.value.trim() })
                      }
                      placeholder="dessin_1"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Toutes les régions ayant le même ID appartiennent au même dessin (ex: corps, queue, oreilles).
                    </span>
                    {/* Quick suggestion of existing drawings on this page */}
                    {Array.from(
                      new Set(
                        page.items
                          .filter((i) => i.type === 'colorCorrect' && i.drawingId)
                          .map((i) => i.drawingId as string)
                      )
                    ).length > 1 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[11px] text-slate-400">Dessins existants :</span>
                        {Array.from(
                          new Set(
                            page.items
                              .filter((i) => i.type === 'colorCorrect' && i.drawingId)
                              .map((i) => i.drawingId as string)
                          )
                        ).map((did) => (
                          <button
                            key={did}
                            type="button"
                            onClick={() => onUpdateItem(selectedItem.id, { drawingId: did })}
                            className={[
                              'px-2 py-0.5 rounded text-[11px] font-bold border transition',
                              selectedItem.drawingId === did
                                ? 'bg-purple-600 border-purple-400 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500',
                            ].join(' ')}
                          >
                            {did}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <label className="flex items-start gap-2.5 font-semibold text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={selectedItem.isCorrect !== false}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { isCorrect: e.target.checked })
                      }
                      className="accent-purple-500 w-4 h-4 rounded mt-0.5"
                    />
                    <div className="text-xs">
                      <span className={selectedItem.isCorrect !== false ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {selectedItem.isCorrect !== false ? '✓ Bonne réponse (dessin à colorier)' : '✗ Distracteur (ne doit pas être colorié)'}
                      </span>
                      <p className="text-slate-400 font-normal">
                        Cochez si l'élève doit identifier et colorier ce dessin dans l'exercice.
                      </p>
                    </div>
                  </label>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Couleur de repère dans l'éditeur
                    </label>
                    <input
                      type="color"
                      value={selectedItem.color || '#8b5cf6'}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { color: e.target.value })
                      }
                      className="w-full h-9 rounded-lg bg-slate-900/80 border border-slate-700/60 p-1 cursor-pointer"
                    />
                  </div>

                  {/* High-Resolution Contour & Region Inspector */}
                  <DrawingContourInspector
                    page={page}
                    item={selectedItem}
                    onUpdateItem={onUpdateItem}
                  />

                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <span>🎯</span> Évaluation par « Corriger »
                    </p>
                    <p className="text-slate-300">
                      L'élève colorie les dessins avec le pot de peinture. Au clic sur « Corriger », les bons dessins coloriés sont entourés en vert lumineux, les distracteurs en rouge, et les dessins oubliés sont signalés en vert sans écraser leurs couleurs.
                    </p>
                  </div>
                </>
              )}

              {/* Paint Bucket Legacy Fields */}
              {selectedItem.type === 'paint' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Nom / Libellé de la zone
                    </label>
                    <input
                      type="text"
                      value={selectedItem.label || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { label: e.target.value })
                      }
                      placeholder="Ex: Toit, Arbre, Pomme..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Identifiant de zone (ID)
                    </label>
                    <input
                      type="text"
                      value={selectedItem.regionId || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { regionId: e.target.value })
                      }
                      placeholder="Ex: region_1"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Couleur de repère dans l'éditeur
                    </label>
                    <input
                      type="color"
                      value={selectedItem.color || '#ec4899'}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { color: e.target.value })
                      }
                      className="w-full h-9 rounded-lg bg-slate-900/80 border border-slate-700/60 p-1 cursor-pointer"
                    />
                  </div>
                </>
              )}

              {/* Arrow Exercise Fields */}
              {selectedItem.type === 'arrow' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Libellé de la flèche
                    </label>
                    <input
                      type="text"
                      value={selectedItem.label || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { label: e.target.value })
                      }
                      placeholder="Ex: Flèche 1 (Mot -> Image)..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Identifiant de l'exercice
                    </label>
                    <input
                      type="text"
                      value={selectedItem.exerciseId || 'exo_arrows_1'}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { exerciseId: e.target.value })
                      }
                      placeholder="exo_arrows_1"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Toutes les flèches ayant le même ID d'exercice sont corrigées ensemble.
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-slate-300">
                        Tolérance d'acceptation
                      </label>
                      <span className="font-mono text-xs text-cyan-400 font-bold">
                        {Math.round((selectedItem.tolerance ?? 0.06) * 100)} %
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="0.15"
                      step="0.01"
                      value={selectedItem.tolerance ?? 0.06}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, {
                          tolerance: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-400">
                      Rayon de marge d'erreur pour les points de départ et d'arrivée.
                    </span>
                  </div>
                  <label className="flex items-start gap-2.5 font-semibold text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={!!selectedItem.bidirectional}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, {
                          bidirectional: e.target.checked,
                        })
                      }
                      className="accent-cyan-500 w-4 h-4 rounded mt-0.5"
                    />
                    <div className="text-xs">
                      <span>Accepter les deux sens (bidirectionnel)</span>
                      <p className="text-slate-400 font-normal">
                        Si coché, l'élève peut tracer de A vers B ou de B vers A.
                      </p>
                    </div>
                  </label>
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <span>🎯</span> Évaluation des flèches
                    </p>
                    <p className="text-slate-300">
                      Au clic sur « Corriger », les flèches correctes s'animent en vert et les erreurs en rouge avec révélation de la flèche attendue en pointillé bleu.
                    </p>
                  </div>
                </>
              )}

              {/* Choice Zone Fields */}
              {selectedItem.type === 'choice' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Sous-question (Groupe d'options)
                    </label>
                    <input
                      type="text"
                      value={selectedItem.questionId || 'Q1'}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, {
                          questionId: e.target.value.trim() || 'Q1',
                        })
                      }
                      placeholder="Ex: Q1, Q2, Question 1, 1a..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                    />
                    {/* Quick suggestions of existing sub-questions on this page */}
                    {(() => {
                      const existingQIds = Array.from(
                        new Set(
                          page.items
                            .filter((i) => i.type === 'choice' && i.questionId)
                            .map((i) => i.questionId as string)
                        )
                      );
                      const currentQ = selectedItem.questionId || 'Q1';
                      return (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="text-[11px] text-slate-400">Sous-questions :</span>
                          {existingQIds.map((qid) => (
                            <button
                              key={qid}
                              type="button"
                              onClick={() => onUpdateItem(selectedItem.id, { questionId: qid })}
                              className={[
                                'px-2 py-0.5 rounded text-[11px] font-bold border transition',
                                currentQ === qid
                                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-sm'
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500',
                              ].join(' ')}
                            >
                              {qid}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const nextNum = existingQIds.length + 1;
                              onUpdateItem(selectedItem.id, { questionId: `Q${nextNum}` });
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-950/60 border border-indigo-700/60 text-indigo-300 hover:bg-indigo-900/60 transition"
                          >
                            + Nouvelle sous-question
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Libellé de l'option
                    </label>
                    <input
                      type="text"
                      value={selectedItem.label || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { label: e.target.value })
                      }
                      placeholder="Ex: Option 1, A, Vrai..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Statut de cette option
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // A sub-question has exactly ONE true option: mark this choice as true,
                          // and all other choices belonging to the same questionId as false!
                          const targetQ = selectedItem.questionId || 'Q1';
                          page.items.forEach((it) => {
                            if (it.type === 'choice' && (it.questionId || 'Q1') === targetQ) {
                              onUpdateItem(it.id, { isCorrect: it.id === selectedItem.id });
                            }
                          });
                        }}
                        className={[
                          'px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5',
                          selectedItem.isCorrect
                            ? 'bg-emerald-600/35 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-slate-200 hover:border-slate-600',
                        ].join(' ')}
                      >
                        <span>✓ Bonne réponse</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateItem(selectedItem.id, { isCorrect: false });
                        }}
                        className={[
                          'px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5',
                          !selectedItem.isCorrect
                            ? 'bg-rose-600/35 border-rose-500 text-rose-300 shadow-md shadow-rose-500/20'
                            : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-slate-200 hover:border-slate-600',
                        ].join(' ')}
                      >
                        <span>✗ Fausse réponse</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      {selectedItem.isCorrect
                        ? `⭐ Cette option est la seule bonne réponse pour ${selectedItem.questionId || 'Q1'}. Les autres options de cette sous-question sont automatiquement fausses.`
                        : `Cette option est une réponse incorrecte (distracteur) pour ${selectedItem.questionId || 'Q1'}.`}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <span>✓</span> Clé de correction secrète
                    </p>
                    <p className="text-slate-300">
                      Chaque sous-question possède sa propre bonne réponse unique. L'élève reçoit une évaluation immédiate lorsqu'il clique sur une option.
                    </p>
                  </div>
                </>
              )}

              {/* Circle Exercise Zone Fields */}
              {selectedItem.type === 'circleExercise' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Sous-question (Groupe d'options)</span>
                      <span className="text-[11px] text-purple-400 font-mono">Entourer la zone</span>
                    </label>
                    <input
                      type="text"
                      value={selectedItem.questionId || 'Q1'}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, {
                          questionId: e.target.value.trim() || 'Q1',
                        })
                      }
                      placeholder="Ex: Q1, Q2, Question 1, 1a..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 font-semibold focus:outline-none focus:border-purple-500"
                    />
                    {/* Quick suggestions of existing sub-questions on this page */}
                    {(() => {
                      const existingQIds = Array.from(
                        new Set(
                          page.items
                            .filter((i) => i.type === 'circleExercise' && i.questionId)
                            .map((i) => i.questionId as string)
                        )
                      );
                      const currentQ = selectedItem.questionId || 'Q1';
                      return (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className="text-[11px] text-slate-400">Sous-questions :</span>
                          {existingQIds.map((qid) => (
                            <button
                              key={qid}
                              type="button"
                              onClick={() => onUpdateItem(selectedItem.id, { questionId: qid })}
                              className={[
                                'px-2 py-0.5 rounded text-[11px] font-bold border transition',
                                currentQ === qid
                                  ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500',
                              ].join(' ')}
                            >
                              {qid}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const nextNum = existingQIds.length + 1;
                              onUpdateItem(selectedItem.id, { questionId: `Q${nextNum}` });
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-950/60 border border-purple-700/60 text-purple-300 hover:bg-purple-900/60 transition"
                          >
                            + Nouvelle sous-question
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Libellé de l'option (Repère enseignant)
                    </label>
                    <input
                      type="text"
                      value={selectedItem.label || ''}
                      onChange={(e) =>
                        onUpdateItem(selectedItem.id, { label: e.target.value })
                      }
                      placeholder="Ex: Option 1, A, Mot 1..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5">
                      Statut de cette option
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const targetQ = selectedItem.questionId || 'Q1';
                          page.items.forEach((it) => {
                            if (it.type === 'circleExercise' && (it.questionId || 'Q1') === targetQ) {
                              onUpdateItem(it.id, { isCorrect: it.id === selectedItem.id });
                            }
                          });
                        }}
                        className={[
                          'px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5',
                          selectedItem.isCorrect
                            ? 'bg-emerald-600/35 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-slate-200 hover:border-slate-600',
                        ].join(' ')}
                      >
                        <span>✓ Bonne réponse</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateItem(selectedItem.id, { isCorrect: false });
                        }}
                        className={[
                          'px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5',
                          !selectedItem.isCorrect
                            ? 'bg-rose-600/35 border-rose-500 text-rose-300 shadow-md shadow-rose-500/20'
                            : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-slate-200 hover:border-slate-600',
                        ].join(' ')}
                      >
                        <span>✗ Fausse réponse</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      {selectedItem.isCorrect
                        ? `⭐ Cette option est la bonne réponse à entourer pour ${selectedItem.questionId || 'Q1'}. Les autres options de cette sous-question sont automatiquement considérées fausses.`
                        : `Cette option est un distracteur pour ${selectedItem.questionId || 'Q1'}. L'entourer affichera une erreur.`}
                    </p>
                  </div>

                  {/* Real-time Sub-Question Validation Card */}
                  {(() => {
                    const currentQ = selectedItem.questionId || 'Q1';
                    const qOptions = page.items.filter(
                      (i) => i.type === 'circleExercise' && (i.questionId || 'Q1') === currentQ
                    );
                    const count = qOptions.length;
                    const correctCount = qOptions.filter((o) => o.isCorrect).length;
                    const isMin2Valid = count >= 2;
                    const isCorrectValid = correctCount === 1;
                    const isQValid = isMin2Valid && isCorrectValid;

                    return (
                      <div
                        className={[
                          'p-3 rounded-xl border text-xs space-y-1.5',
                          isQValid
                            ? 'bg-purple-950/30 border-purple-500/30 text-purple-200'
                            : 'bg-amber-950/30 border-amber-500/30 text-amber-200',
                        ].join(' ')}
                      >
                        <p className="font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            {isQValid ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            Validation : Sous-question {currentQ}
                          </span>
                          <span className="font-mono text-[10px] bg-slate-900/60 px-1.5 py-0.5 rounded">
                            {count} option{count > 1 ? 's' : ''}
                          </span>
                        </p>
                        {!isMin2Valid && (
                          <p className="text-amber-300/90 text-[11px]">
                            ⚠️ Doit comporter au moins 2 options (actuellement {count}). Dessinez d'autres zones pour {currentQ}.
                          </p>
                        )}
                        {correctCount === 0 && (
                          <p className="text-amber-300/90 text-[11px]">
                            ⚠️ Aucune bonne réponse désignée. Cliquez sur "Bonne réponse" pour une option.
                          </p>
                        )}
                        {correctCount > 1 && (
                          <p className="text-amber-300/90 text-[11px]">
                            ⚠️ {correctCount} bonnes réponses désignées. Exactement 1 seule est permise.
                          </p>
                        )}
                        {isQValid && (
                          <p className="text-emerald-300/90 text-[11px]">
                            ✓ Sous-question valide ({count} options, 1 bonne réponse unique).
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <span>⭕</span> Comportement élève
                    </p>
                    <p className="text-slate-300">
                      L'élève active l'outil « Entourer la zone » dans sa barre d'outils puis clique sur une option. Un cercle/ovale entoure automatiquement le mot ou dessin et indique immédiatement le résultat.
                    </p>
                  </div>
                </>
              )}

              {/* Drag and Drop Exercise Fields */}
              {selectedItem.type === 'dragDrop' && (
                <>
                  {/* Two mutually exclusive buttons: Drag Zone vs Drop Zone */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-2 flex items-center justify-between">
                      <span>Rôle de cette zone</span>
                      <span className="text-[11px] text-blue-400 font-mono">Glisser-Déposer</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const existingDrags = page.items.filter((i) => i.type === 'dragDrop' && (i.dragDropMode === 'drag' || !i.dragDropMode));
                          onUpdateItem(selectedItem.id, {
                            dragDropMode: 'drag',
                            dragId: selectedItem.dragId || `drag_${existingDrags.length + 1}`,
                          });
                        }}
                        className={[
                          'px-3 py-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1',
                          (selectedItem.dragDropMode || 'drag') === 'drag'
                            ? 'bg-blue-600/35 border-blue-500 text-blue-300 shadow-md shadow-blue-500/20'
                            : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-slate-200 hover:border-slate-600',
                        ].join(' ')}
                      >
                        <span className="flex items-center gap-1.5 font-bold">
                          <span>✋ Élément à glisser</span>
                        </span>
                        <span className="text-[10px] font-normal opacity-80">(Drag Zone)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const existingDrops = page.items.filter((i) => i.type === 'dragDrop' && i.dragDropMode === 'drop');
                          onUpdateItem(selectedItem.id, {
                            dragDropMode: 'drop',
                            dropId: selectedItem.dropId || `drop_${existingDrops.length + 1}`,
                          });
                        }}
                        className={[
                          'px-3 py-2.5 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1',
                          selectedItem.dragDropMode === 'drop'
                            ? 'bg-cyan-600/35 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/20'
                            : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-slate-200 hover:border-slate-600',
                        ].join(' ')}
                      >
                        <span className="flex items-center gap-1.5 font-bold">
                          <span>🎯 Zone cible</span>
                        </span>
                        <span className="text-[10px] font-normal opacity-80">(Drop Zone)</span>
                      </button>
                    </div>
                  </div>

                  {/* DRAG ZONE CONFIGURATION */}
                  {(selectedItem.dragDropMode || 'drag') === 'drag' && (
                    <>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                          <span>Identifiant de l'élément (Drag ID)</span>
                          <span className="text-[10px] text-slate-400">Unique par élément</span>
                        </label>
                        <input
                          type="text"
                          value={selectedItem.dragId || ''}
                          onChange={(e) =>
                            onUpdateItem(selectedItem.id, {
                              dragId: e.target.value.trim().replace(/\s+/g, '_'),
                            })
                          }
                          placeholder="Ex: drag_1, mot_chat, oiseau..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Extracted Draggable Image Asset Preview & Recapture */}
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-xs text-slate-200 flex items-center gap-1.5">
                            <span>Image capturée de l'élément</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRecaptureDragItem(selectedItem)}
                            className="px-2 py-1 rounded-md text-[11px] font-medium bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 transition flex items-center gap-1"
                            title="Recapturer les pixels depuis la page"
                          >
                            <span>📸 Recapturer</span>
                          </button>
                        </div>

                        {selectedItem.dragImageDataUrl ? (
                          <div className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center p-2 min-h-[90px]">
                            {/* Checkerboard background for transparency preview */}
                            <div
                              className="absolute inset-0 opacity-15"
                              style={{
                                backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                                backgroundSize: '8px 8px',
                              }}
                            />
                            <img
                              src={selectedItem.dragImageDataUrl}
                              alt={selectedItem.dragId || 'Élément à glisser'}
                              className="max-h-24 max-w-full object-contain relative z-10 rounded shadow-md"
                            />
                          </div>
                        ) : (
                          <div className="rounded-lg bg-slate-950/70 border border-dashed border-slate-700/80 p-4 text-center">
                            <p className="text-xs text-slate-400">Aucune capture effectuée</p>
                            <button
                              type="button"
                              onClick={() => handleRecaptureDragItem(selectedItem)}
                              className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition inline-flex items-center gap-1.5"
                            >
                              <span>Capturer l'élément maintenant</span>
                            </button>
                          </div>
                        )}

                        {/* Optional transparent cutout toggle */}
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-medium text-slate-300 block">Détourer le fond blanc</span>
                            <span className="text-[10px] text-slate-400 block">Rend transparent le fond blanc de l'image</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleTransparentBg(selectedItem)}
                            className={[
                              'w-9 h-5 rounded-full transition-colors relative',
                              selectedItem.isTransparentBg ? 'bg-blue-600' : 'bg-slate-750',
                            ].join(' ')}
                          >
                            <div
                              className={[
                                'w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5',
                                selectedItem.isTransparentBg ? 'translate-x-4' : 'translate-x-0.5',
                              ].join(' ')}
                            />
                          </button>
                        </div>
                      </div>

                      {/* BACKGROUND REMOVAL & CLEANUP CONFIGURATION */}
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-2.5">
                        <div>
                          <label className="font-semibold text-xs text-slate-200 block mb-1">
                            Nettoyage du fond d'origine (Masque)
                          </label>
                          <p className="text-[11px] text-slate-400 leading-tight">
                            Recouvre l'emplacement d'origine de l'élément pour qu'il disparaisse du document quand l'élève le déplace.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-300 min-w-max">Couleur de fond :</label>
                          <input
                            type="color"
                            value={selectedItem.maskColor || '#ffffff'}
                            onChange={(e) => onUpdateItem(selectedItem.id, { maskColor: e.target.value })}
                            className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={selectedItem.maskColor || '#ffffff'}
                            onChange={(e) => onUpdateItem(selectedItem.id, { maskColor: e.target.value })}
                            className="w-24 px-2 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-xs text-slate-200"
                          />
                          <div className="flex gap-1 ml-auto">
                            <button
                              type="button"
                              onClick={() => onUpdateItem(selectedItem.id, { maskColor: '#ffffff' })}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white"
                              title="Blanc pur (standard livre)"
                            >
                              Blanc
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateItem(selectedItem.id, { maskColor: '#faf7f2' })}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-100"
                              title="Papier crème"
                            >
                              Crème
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-slate-300 mb-1">
                            <span>Marge d'effacement (Padding) :</span>
                            <span className="font-mono text-blue-400">{selectedItem.maskPadding ?? 2}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="8"
                            step="1"
                            value={selectedItem.maskPadding ?? 2}
                            onChange={(e) => onUpdateItem(selectedItem.id, { maskPadding: parseInt(e.target.value, 10) })}
                            className="w-full accent-blue-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* DROP ZONE CONFIGURATION */}
                  {selectedItem.dragDropMode === 'drop' && (
                    <>
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                          <span>Identifiant de la cible (Drop ID)</span>
                          <span className="text-[10px] text-slate-400">Unique par cible</span>
                        </label>
                        <input
                          type="text"
                          value={selectedItem.dropId || ''}
                          onChange={(e) =>
                            onUpdateItem(selectedItem.id, {
                              dropId: e.target.value.trim().replace(/\s+/g, '_'),
                            })
                          }
                          placeholder="Ex: drop_1, cible_arbre..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Association with Drag Zone */}
                      <div>
                        <label className="block font-semibold text-slate-300 mb-1.5">
                          Élément à glisser accepté (Drag Zone Source)
                        </label>
                        {(() => {
                          const availableDragItems = page.items.filter(
                            (i) => i.type === 'dragDrop' && (i.dragDropMode === 'drag' || !i.dragDropMode)
                          );
                          const acceptedItem = availableDragItems.find(
                            (i) => (i.dragId || i.id) === selectedItem.targetDragId
                          );

                          return (
                            <div className="space-y-2">
                              <select
                                value={selectedItem.targetDragId || ''}
                                onChange={(e) =>
                                  onUpdateItem(selectedItem.id, {
                                    targetDragId: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 font-medium focus:outline-none focus:border-cyan-500"
                              >
                                <option value="">-- Choisir l'élément à glisser accepté --</option>
                                {availableDragItems.map((di) => (
                                  <option key={di.id} value={di.dragId || di.id}>
                                    {di.dragId || di.id} (Élément page {pageNumber})
                                  </option>
                                ))}
                              </select>

                              {availableDragItems.length === 0 && (
                                <p className="text-amber-400 text-xs flex items-center gap-1.5 p-2 rounded-lg bg-amber-950/30 border border-amber-800/40">
                                  <AlertTriangle className="w-3.5 h-3.5 flex-none" />
                                  <span>Aucun élément à glisser créé sur cette page. Créez d'abord une zone "Élément à glisser".</span>
                                </p>
                              )}

                              {!selectedItem.targetDragId && availableDragItems.length > 0 && (
                                <p className="text-amber-400 text-xs flex items-center gap-1.5 p-2 rounded-lg bg-amber-950/30 border border-amber-800/40">
                                  <AlertTriangle className="w-3.5 h-3.5 flex-none" />
                                  <span>Veuillez sélectionner l'élément que cette cible doit accepter.</span>
                                </p>
                              )}

                              {acceptedItem && (
                                <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 flex items-center gap-2.5">
                                  {acceptedItem.dragImageDataUrl ? (
                                    <img
                                      src={acceptedItem.dragImageDataUrl}
                                      alt={acceptedItem.dragId}
                                      className="w-10 h-10 object-contain rounded bg-slate-900 border border-slate-700"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-xs text-slate-500">
                                      ✋
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-xs font-bold text-cyan-300 block">
                                      Accepte : {acceptedItem.dragId || acceptedItem.id}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      L'élève devra déposer cet élément ici pour réussir.
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-300 mb-1.5">
                          Indice visuel cible (Repère enseignant)
                        </label>
                        <input
                          type="text"
                          value={selectedItem.label || ''}
                          onChange={(e) =>
                            onUpdateItem(selectedItem.id, { label: e.target.value })
                          }
                          placeholder="Ex: Emplacement 1, Déposer ici..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-100 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </>
                  )}

                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <span>✋</span> Comportement élève
                    </p>
                    <p className="text-slate-300">
                      L'élève clique et glisse l'image capturée vers sa cible. L'arrière-plan d'origine est masqué proprement pour ne pas laisser de double visible. Si le placement est correct, l'élément s'aimante en vert. S'il est incorrect, il tremble en rouge et retourne à son point de départ.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
