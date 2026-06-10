import axios from 'axios';

/**
 * 把 <input type="datetime-local"> 的本地值（"YYYY-MM-DDTHH:mm"）转成后端要的 RFC3339。
 * 空串返回空串（表示「未填」）。
 */
export function localInputToISO(local: string): string {
  if (!local) return '';
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

/**
 * 把后端的 RFC3339/ISO 字符串转成 datetime-local 控件能显示的本地值 "YYYY-MM-DDTHH:mm"。
 * 空/非法返回空串。
 */
export function isoToLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 从未知错误里提取后端返回的 { error } 文案；取不到则回退到 fallback。
 */
export function getApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || fallback;
  }
  return fallback;
}
