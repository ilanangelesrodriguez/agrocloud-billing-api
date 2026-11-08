import { describe, expect, it } from 'vitest';
import { chargeMatchesOrder, parseCulqiData } from '../src/common/utils/charge-verification.js';
const order = { externalReference: 'AGRO-ORDER-123', amountCents: 7900, currency: 'PEN' };
const charge = { id: 'chr_test_valid', object: 'charge', amount: 7900, currency_code: 'PEN',
  outcome: { type: 'venta_exitosa' }, metadata: { external_reference: 'AGRO-ORDER-123' } };
describe('Verificación de cargos', () => {
  it('acepta un cargo completamente coincidente', () => expect(chargeMatchesOrder(charge, order)).toBe(true));
  it('rechaza montos diferentes', () => expect(chargeMatchesOrder({ ...charge, amount: 8000 }, order)).toBe(false));
  it('rechaza referencias diferentes', () => expect(chargeMatchesOrder({ ...charge, metadata: { external_reference: 'OTHER' } }, order)).toBe(false));
  it('rechaza cargos no exitosos', () => expect(chargeMatchesOrder({ ...charge, outcome: { type: 'venta_denegada' } }, order)).toBe(false));
  it('interpreta el data serializado de Culqi', () => expect(parseCulqiData('{"id":"chr_test_1"}')?.id).toBe('chr_test_1'));
  it('rechaza JSON no válido', () => expect(parseCulqiData('foo')).toBeNull());
});
