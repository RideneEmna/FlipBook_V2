'use client';

import React, { useState, useMemo } from 'react';
import {
  TextSelect,
  Highlighter,
  Lasso,
  Volume2,
  Music,
  Video,
  ZoomIn,
  TextCursorInput,
  Eye,
  CheckSquare,
  CheckCircle2,
  Palette,
  PaintBucket,
  ArrowUpRight,
  CheckCircle,
  Circle,
  Move,
  Search,
  Sparkles,
} from 'lucide-react';
import { TOOL_DEFS, type InteractiveToolKey, type ToolDef } from './types';

const TOOL_ICONS: Record<InteractiveToolKey, React.ComponentType<{ className?: string }>> = {
  select: TextSelect,
  highlight: Highlighter,
  lasso: Lasso,
  tts: Volume2,
  audio: Music,
  video: Video,
  zoom: ZoomIn,
  blank: TextCursorInput,
  reveal: Eye,
  check: CheckSquare,
  button: CheckCircle2,
  freeColoring: Palette,
  colorCorrect: PaintBucket,
  paint: PaintBucket,
  arrow: ArrowUpRight,
  choice: CheckCircle,
  circleExercise: Circle,
  dragDrop: Move,
};

type WidgetCategory = 'all' | 'exercises' | 'media' | 'annotations';

interface CategoryFilter {
  id: WidgetCategory;
  label: string;
}

const CATEGORIES: CategoryFilter[] = [
  { id: 'all', label: 'Tous' },
  { id: 'exercises', label: 'Exercices' },
  { id: 'media', label: 'Médias' },
  { id: 'annotations', label: 'Outils' },
];

const EXERCISE_TOOLS: InteractiveToolKey[] = [
  'choice',
  'circleExercise',
  'arrow',
  'dragDrop',
  'colorCorrect',
  'blank',
  'check',
  'button',
];

const MEDIA_TOOLS: InteractiveToolKey[] = [
  'tts',
  'audio',
  'video',
  'zoom',
  'reveal',
];

const ANNOTATION_TOOLS: InteractiveToolKey[] = [
  'highlight',
  'lasso',
  'select',
];

function getToolCategory(key: InteractiveToolKey): WidgetCategory {
  if (EXERCISE_TOOLS.includes(key)) return 'exercises';
  if (MEDIA_TOOLS.includes(key)) return 'media';
  if (ANNOTATION_TOOLS.includes(key)) return 'annotations';
  return 'exercises';
}

function getModeBadge(k: ToolDef['k']) {
  switch (k) {
    case 'rect':
      return 'Rectangle';
    case 'lasso':
      return 'Lasso';
    case 'arrow':
      return 'Flèche';
    case 'pt':
      return 'Clic';
    default:
      return 'Zone';
  }
}

interface Props {
  activeTool: InteractiveToolKey | null;
  onPickTool: (key: InteractiveToolKey) => void;
}

export default function WidgetsCatalogue({ activeTool, onPickTool }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<WidgetCategory>('all');

  const visibleTools = useMemo(() => {
    const keys = (Object.keys(TOOL_DEFS) as InteractiveToolKey[]).filter(
      (k) => !TOOL_DEFS[k].hidden
    );

    return keys.filter((key) => {
      const def = TOOL_DEFS[key];
      // Category filter
      if (selectedCat !== 'all' && getToolCategory(key) !== selectedCat) {
        return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = def.n.toLowerCase().includes(q);
        const matchHint = def.hint.toLowerCase().includes(q);
        return matchName || matchHint;
      }
      return true;
    });
  }, [selectedCat, search]);

  return (
    <div className="flex flex-col gap-3">
      {/* Header and Search */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un widget..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 custom-scrollbar">
          {CATEGORIES.map((cat) => {
            const isCatActive = selectedCat === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                className={[
                  'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0',
                  isCatActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800',
                ].join(' ')}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Miniatures */}
      {visibleTools.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
          Aucun widget ne correspond à votre recherche.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {visibleTools.map((key) => {
            const def = TOOL_DEFS[key];
            const Icon = TOOL_ICONS[key] || Sparkles;
            const isActive = activeTool === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onPickTool(key)}
                title={def.hint}
                className={[
                  'group relative flex flex-col items-start p-2.5 rounded-xl text-left border transition-all duration-200',
                  isActive
                    ? 'bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-900/30'
                    : 'bg-slate-900/70 border-slate-800/90 hover:bg-slate-850 hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5',
                ].join(' ')}
              >
                {/* Active Indicator Badge */}
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                )}

                {/* Top Row: Icon Miniature + Mode Tag */}
                <div className="w-full flex items-center justify-between gap-1 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center border shadow-inner transition group-hover:scale-105"
                    style={{
                      backgroundColor: `${def.c}18`,
                      borderColor: `${def.c}44`,
                      color: def.c,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {getModeBadge(def.k)}
                  </span>
                </div>

                {/* Title */}
                <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate w-full mb-0.5">
                  {def.n}
                </span>

                {/* Hint/Description Preview */}
                <p className="text-[10px] text-slate-400 group-hover:text-slate-300 line-clamp-2 leading-tight">
                  {def.hint}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Helpful Hint footer */}
      <div className="mt-1 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
        <span>
          Cliquez sur une miniature ci-dessus pour activer le widget, puis tracez ou cliquez sur la page centrale.
        </span>
      </div>
    </div>
  );
}
