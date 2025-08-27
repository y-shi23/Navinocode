import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// 规范化网址，允许无协议输入，默认补全为 https
export function normalizeUrl(raw) {
  if (!raw) return '';
  let u = String(raw).trim();
  if (!u) return '';
  if (u.startsWith('//')) return `https:${u}`;
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  return u;
}

// 计算应用展示字母：优先名称首字母，其次 URL 主域名首字母，最后回退 icon 的首字母
export function computeAppLetter({ name, url, icon }) {
  const n = (name || '').trim();
  if (n) return n.charAt(0).toUpperCase();

  const u = normalizeUrl(url || '');
  try {
    const hostname = new URL(u).hostname.replace(/^www\./, '');
    if (hostname) return hostname.charAt(0).toUpperCase();
  } catch {}

  const i = (icon || '').trim();
  return i ? i.charAt(0).toUpperCase() : 'A';
}
