import { useState, useCallback, type ReactNode } from 'react';
import { GridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

/* ═══════════════════════════════════════
   DraggableGrid — dashboard card layout
   Drag to reorder + resize from bottom-right
   Layout persisted to localStorage
   ═══════════════════════════════════════ */

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DraggableGridProps {
  storageKey: string;
  defaultLayout: LayoutItem[];
  children: Record<string, ReactNode>;
  cols?: number;
  rowHeight?: number;
  gap?: number;
}

export function DraggableGrid({
  storageKey,
  defaultLayout,
  children,
  cols = 4,
  rowHeight = 30,
  gap = 16,
}: DraggableGridProps) {
  const { width, containerRef } = useContainerWidth();

  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    try {
      const saved = localStorage.getItem(`rgl-${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved) as LayoutItem[];
        const savedIds = new Set(parsed.map(p => p.i));
        const missing = defaultLayout.filter(d => !savedIds.has(d.i));
        return [...parsed, ...missing];
      }
    } catch { /* ignore */ }
    return defaultLayout;
  });

  const handleLayoutChange = useCallback((newLayout: readonly LayoutItem[]) => {
    const items = [...newLayout];
    setLayout(items);
    try {
      localStorage.setItem(`rgl-${storageKey}`, JSON.stringify(items));
    } catch { /* ignore */ }
  }, [storageKey]);

  return (
    <div ref={containerRef} className="draggable-grid-container">
      {width > 0 && (
        <GridLayout
          layout={layout}
          width={width}
          gridConfig={{ cols, rowHeight, margin: [gap, gap], containerPadding: [0, 0] }}
          dragConfig={{ enabled: true, handle: '.grid-drag-handle' }}
          resizeConfig={{ enabled: true, handles: ['se'] }}
          onLayoutChange={handleLayoutChange}
        >
          {Object.entries(children).map(([key, node]) => (
            <div key={key} className="grid-item">{node}</div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}

/* ─── Drag handle — grab dots icon ──────── */
export function GridDragHandle({ className = '' }: { className?: string }) {
  return (
    <div className={`grid-drag-handle ${className}`} title="拖拽移动">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--text-3)">
        <circle cx="2" cy="2" r="1" />
        <circle cx="8" cy="2" r="1" />
        <circle cx="2" cy="5" r="1" />
        <circle cx="8" cy="5" r="1" />
        <circle cx="2" cy="8" r="1" />
        <circle cx="8" cy="8" r="1" />
      </svg>
    </div>
  );
}
