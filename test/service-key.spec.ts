import { describe, expect, it } from 'vitest';
import { equalSecret } from '../src/common/auth/service-key.guard.js';
describe('Secretos de servicio', () => {
  it('acepta solo valores idénticos', () => {
    expect(equalSecret('A'.repeat(32), 'A'.repeat(32))).toBe(true);
    expect(equalSecret('A'.repeat(32), 'B'.repeat(32))).toBe(false);
    expect(equalSecret('A', 'AAAA')).toBe(false);
    expect(equalSecret(undefined, 'AAAA')).toBe(false);
  });
});
