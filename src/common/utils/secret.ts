import { timingSafeEqual } from 'node:crypto';

export function equalSecret(value: string | undefined, expected: string): boolean {
  if (!value || !expected) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
