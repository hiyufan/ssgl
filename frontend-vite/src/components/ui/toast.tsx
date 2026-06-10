import { create } from 'zustand';

type ToastType = 'success' | 'error';
interface ToastItem { id: number; type: ToastType; message: string; }

interface ToastState {
  toasts: ToastItem[];
  push: (type: ToastType, message: string) => void;
  dismiss: (id: number) => void;
}

let seq = 0;
const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (type, message) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** 便捷调用：toast.success(msg) / toast.error(msg) —— 可在事件回调里直接用，无需 hook。 */
// eslint-disable-next-line react-refresh/only-export-components
export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string) => useToastStore.getState().push('error', message),
};

/** 右下角 toast 视口，在 main.tsx 挂载一次。 */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
      {toasts.map((t) => (
        <Toast key={t.id} item={t} onDone={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function Toast({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const isErr = item.type === 'error';
  const accent = isErr ? 'var(--red)' : 'var(--green)';
  const bg = isErr ? 'var(--red-bg)' : 'var(--green-bg)';
  return (
    <div
      className="card anim-scale"
      onClick={onDone}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
        borderLeft: `3px solid ${accent}`, background: bg, cursor: 'pointer',
        boxShadow: 'var(--shadow)',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, lineHeight: 1.5 }}>{item.message}</span>
    </div>
  );
}
