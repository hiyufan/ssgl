import type { ReactNode } from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { Icon } from './icon';
import { isoToLocalInput, localInputToISO } from '@/lib/form-utils';

/** 带提交/取消页脚、提交态与错误条的弹窗表单容器。 */
export function FormModal({
  open, onClose, title, onSubmit, submitting, error, submitLabel = '保存', width = 560, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onSubmit: () => void;
  submitting?: boolean;
  error?: string | null;
  submitLabel?: string;
  width?: number;
  children: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={width}>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {error && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--red-bg)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: 12, lineHeight: 1.5 }}>
            {error}
          </div>
        )}
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>取消</Button>
          <Button type="submit" variant="primary" loading={submitting}>{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

/** label + 必填星标 + 控件。 */
export function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 4 }}>*</span>}
      </span>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="forge-input" {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="forge-input" style={{ resize: 'vertical', minHeight: 72, ...props.style }} {...props} />;
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" className="forge-input" {...props} />;
}

export interface SelectOption { value: string; label: string; }
export function Select({ value, onChange, options, placeholder, disabled }: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select className="forge-input" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** datetime-local 控件，value/onChange 走 RFC3339(ISO) 字符串。 */
export function DateTimeInput({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  return (
    <input
      type="datetime-local"
      className="forge-input"
      value={isoToLocalInput(value)}
      onChange={(e) => onChange(localInputToISO(e.target.value))}
    />
  );
}

/** 1–5 星可点选评分。 */
export function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}
            aria-label={`${i + 1} 星`}
          >
            <span style={{ color: filled ? 'var(--amber)' : 'var(--border-2)' }}>
              <Icon name="star" size={20} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
