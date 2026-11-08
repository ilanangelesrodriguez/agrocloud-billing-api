export interface ChargeSnapshot {
  id: string;
  object?: string;
  amount?: number;
  currency_code?: string;
  outcome?: { type?: string };
  metadata?: Record<string, unknown>;
}

export function chargeMatchesOrder(
  charge: ChargeSnapshot,
  order: { externalReference: string; amountCents: number; currency: string },
): boolean {
  return (
    typeof charge.id === 'string' &&
    charge.object === 'charge' &&
    charge.amount === order.amountCents &&
    charge.currency_code === order.currency &&
    charge.metadata?.external_reference === order.externalReference &&
    charge.outcome?.type === 'venta_exitosa'
  );
}

export function parseCulqiData(data: unknown): Record<string, unknown> | null {
  try {
    const candidate: unknown = typeof data === 'string' ? JSON.parse(data) : data;
    return candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate)
      ? (candidate as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
