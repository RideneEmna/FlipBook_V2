'use client';

import React from 'react';
import { Settings2, X, Sliders, Info, Layers, Trash2 } from 'lucide-react';
import type { StudioConfigPage, InteractiveItem } from './types';
import { TOOL_DEFS } from './types';
import PageConfigPanel from './PageConfigPanel';

interface Props {
  page: StudioConfigPage;
  pageNumber: number;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (id: string, updates: Partial<InteractiveItem>) => void;
  onDeleteItem: (id: string) => void;
}

export default function PagePropertiesSidebar({
  page,
  pageNumber,
  selectedItemId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
}: Props) {
  const selectedItem = page.items.find((it) => it.id === selectedItemId);
  const toolDef = selectedItem ? TOOL_DEFS[selectedItem.type] : null;

  return (
    <aside className="rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col h-full min-h-[700px] lg:h-[calc(100vh-170px)] overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950/40 flex-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-none">
            <Settings2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white truncate">Propriétés</h3>
            <p className="text-[10px] text-slate-400 truncate">
              {selectedItem
                ? toolDef?.n || selectedItem.type
                : `Page ${pageNumber} · ${page.items.length} élément(s)`}
            </p>
          </div>
        </div>

        {selectedItem && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDeleteItem(selectedItem.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
              title="Supprimer cet élément"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onSelectItem(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Désélectionner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Body */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3.5">
        {selectedItem ? (
          <PageConfigPanel
            section="properties"
            page={page}
            pageNumber={pageNumber}
            selectedItemId={selectedItemId}
            onSelectItem={onSelectItem}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
          />
        ) : (
          <div className="py-6 px-2 flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-850/80 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
              <Sliders className="w-6 h-6 text-slate-400" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-200">
                Aucun élément sélectionné
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-[240px]">
                Cliquez sur un élément sur la page centrale ou dans l'onglet{' '}
                <span className="text-indigo-300 font-medium">« Éléments »</span> à gauche pour configurer ses propriétés.
              </p>
            </div>

            {/* Page Overview Card */}
            <div className="w-full rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 text-left space-y-2 mt-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                <span>Informations de la page</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-800">
                  <span className="text-slate-400 block">Page active</span>
                  <span className="font-bold text-white text-xs">{pageNumber}</span>
                </div>
                <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-800">
                  <span className="text-slate-400 block">Éléments configurés</span>
                  <span className="font-bold text-indigo-300 text-xs">{page.items.length}</span>
                </div>
              </div>
            </div>

            {/* Quick tips */}
            <div className="w-full text-left text-[11px] text-slate-500 bg-slate-900/30 rounded-xl p-2.5 border border-dashed border-slate-800 flex items-start gap-2">
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Pour ajouter un nouveau widget, ouvrez l'onglet{' '}
                <strong className="text-slate-300">« Widgets »</strong> dans le panneau gauche.
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
