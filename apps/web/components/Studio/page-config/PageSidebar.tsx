'use client';

import React, { useState } from 'react';
import { LayoutGrid, ListTree, Boxes } from 'lucide-react';
import type { InteractiveItem, InteractiveToolKey, StudioConfigPage } from './types';
import { TOOL_DEFS } from './types';
import PageThumbnailsStrip from './PageThumbnailsStrip';
import PageConfigPanel from './PageConfigPanel';
import WidgetsCatalogue from './WidgetsCatalogue';

type TabKey = 'pages' | 'elements' | 'widgets';

interface Props {
  // Pages
  pages: StudioConfigPage[];
  currentPageIndex: number;
  onSelectPage: (idx: number) => void;
  onDuplicatePage: (idx: number) => void;
  onDeletePage: (idx: number) => void;
  onAddBlankPage: () => void;
  onImportPdfPages: (doc: any, fileName: string) => void;
  onReorderPages: (fromIdx: number, toIdx: number) => void;
  onToast: (msg: string) => void;
  // Current page items
  page: StudioConfigPage;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (id: string, updates: Partial<InteractiveItem>) => void;
  onDeleteItem: (id: string) => void;
  activeTool?: InteractiveToolKey | null;
  onPickTool: (key: InteractiveToolKey) => void;
}

/**
 * Left sidebar of the page editor: Pages (2-col grid) · Éléments · Widgets (miniatures).
 * The Properties tab is moved to the dedicated right sidebar.
 */
export default function PageSidebar(props: Props) {
  const { page, currentPageIndex, selectedItemId, onSelectItem, activeTool, onPickTool } = props;
  const [tab, setTab] = useState<TabKey>('elements');

  const visibleToolCount = Object.keys(TOOL_DEFS).filter(
    (k) => !TOOL_DEFS[k as InteractiveToolKey].hidden
  ).length;

  const tabs: { key: TabKey; label: string; Icon: typeof LayoutGrid; badge?: number }[] = [
    { key: 'pages', label: 'Pages', Icon: LayoutGrid, badge: props.pages.length },
    { key: 'elements', label: 'Éléments', Icon: ListTree, badge: page.items.length },
    { key: 'widgets', label: 'Widgets', Icon: Boxes, badge: visibleToolCount },
  ];

  return (
    <aside className="rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col h-full min-h-[700px] lg:h-[calc(100vh-170px)] overflow-hidden">
      {/* Tab Switcher Header */}
      <div role="tablist" aria-label="Panneau de gauche" className="flex gap-1 p-1.5 border-b border-slate-800 bg-slate-950/40 flex-none">
        {tabs.map(({ key, label, Icon, badge }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={[
                'flex-1 min-w-0 flex items-center justify-center gap-1 px-1.5 py-2 rounded-xl text-[11px] font-bold transition-all',
                active
                  ? 'bg-indigo-600/30 text-white ring-1 ring-indigo-500 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70',
              ].join(' ')}
            >
              <Icon className="w-3.5 h-3.5 flex-none" />
              <span className="whitespace-nowrap">{label}</span>
              {badge !== undefined && (
                <span
                  className={[
                    'text-[10px] px-1 py-0.5 rounded-full flex-none transition leading-none font-semibold',
                    active
                      ? 'bg-indigo-500/30 text-indigo-200'
                      : 'bg-slate-800 text-slate-300',
                  ].join(' ')}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3">
        {tab === 'pages' && (
          <PageThumbnailsStrip
            layout="grid"
            pages={props.pages}
            currentPageIndex={currentPageIndex}
            onSelectPage={props.onSelectPage}
            onDuplicatePage={props.onDuplicatePage}
            onDeletePage={props.onDeletePage}
            onAddBlankPage={props.onAddBlankPage}
            onImportPdfPages={props.onImportPdfPages}
            onReorderPages={props.onReorderPages}
            onToast={props.onToast}
          />
        )}

        {tab === 'elements' && (
          <PageConfigPanel
            section="elements"
            page={page}
            pageNumber={currentPageIndex + 1}
            selectedItemId={selectedItemId}
            onSelectItem={onSelectItem}
            onUpdateItem={props.onUpdateItem}
            onDeleteItem={props.onDeleteItem}
            onOpenWidgetsTab={() => setTab('widgets')}
            onPickTool={(toolKey) => {
              onPickTool(toolKey);
            }}
          />
        )}

        {tab === 'widgets' && (
          <WidgetsCatalogue
            activeTool={activeTool || null}
            onPickTool={(toolKey) => {
              onPickTool(toolKey);
            }}
          />
        )}
      </div>
    </aside>
  );
}
