import { randomUUID } from 'crypto';

export function shortId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 8);
}

export function customSlug(): string {
  return `custom-${shortId()}`;
}

export function cloneSlug(originSlug: string | null): string {
  const base = originSlug ?? 'exercise';
  return `${base}-copy-${shortId()}`;
}
