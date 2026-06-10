import { useState, useCallback, type ReactNode } from 'react';
import { GridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

/* ═══════════════════════════════════════
   DraggableGrid — dashboard card layout
   Supports drag-to-reorder + resize
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
  isDraggable?: boolean;
  isResizable?: boolean;
}

export function DraggableGrid({
  storageKey,
  defaultLayout,
  children,
  cols = 4,
  rowHeight = 120,
  gap = 16,
  isDraggable = true,
  isResizable = true,
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
    <div ref={containerRef}>
      {width > 0 && (
        <GridLayout
          layout={layout}
          width={width}
          gridConfig={{ cols, rowHeight, margin: [gap, gap], containerPadding: [0, 0] }}
          dragConfig={{ enabled: isDraggable }}
          resizeConfig={{ enabled: isResizable, handles: ['se'] }}
          onLayoutChange={handleLayoutChange}
          style={{ position: 'relative' }}
        >
          {Object.entries(children).map(([key, node]) => (
            <div key={key} className="grid-item-wrapper">{node}</div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}

/* ─── Drag handle for cards ─────────────── */
export function GridDragHandle({ className = '' }: { className?: string }) {
  return (
    <div className={`grid-drag-handle ${className}`} style={{
      cursor: 'grab',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 20,
      height: 20,
      opacity: 0.3,
      transition: 'opacity 0.2s',
      flexShrink: 0,
    }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="var(--text-3)">
        <circle cx="3" cy="2" r="1.2" />
        <circle cx="9" cy="2" r="1.2" />
        <circle cx="3" cy="6" r="1.2" />
        <circle cx="9" cy="6" r="1.2" />
        <circle cx="3" cy="10" r="1.2" />
        <circle cx="9" cy="10" r="1.2" />
      </svg>
    </div>
  );
}
