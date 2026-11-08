import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHmac } from 'node:crypto';
import type { Model } from 'mongoose';
import { OutboundEvent } from './outbox.schema.js';
@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxService.name);
  private timer?: ReturnType<typeof setInterval>;
  constructor(@InjectModel(OutboundEvent.name) private readonly events: Model<OutboundEvent>, private readonly config: ConfigService) {}
  onModuleInit(): void {
    const delay = this.config.get<number>('OUTBOX_INTERVAL_MS', 30000);
    this.timer = setInterval(() => void this.dispatchDue().catch(() => this.logger.warn('Reintento de notificaciones falló')), delay);
    this.timer.unref();
  }
  onModuleDestroy(): void { if (this.timer) clearInterval(this.timer); }
  async enqueuePayment(order: { externalReference: string; companyId: number; amountCents: number; currency: string; kind: string; culqiChargeId?: string }): Promise<void> {
    const eventKey = `payment.succeeded:${order.externalReference}`;
    try {
      await this.events.updateOne({ eventKey }, { $setOnInsert: {
        eventKey, eventType: 'payment.succeeded', status: 'PENDING', attempts: 0, nextAttemptAt: new Date(),
        payload: { event_id: eventKey, type: 'payment.succeeded', order_reference: order.externalReference,
          company_id: order.companyId, amount_cents: order.amountCents, currency: order.currency,
          kind: order.kind, provider_charge_id: order.culqiChargeId },
      } }, { upsert: true });
    } catch (error: unknown) { if ((error as { code?: number }).code !== 11000) throw error; }
    await this.dispatchOne(eventKey);
  }
  async dispatchDue(limit = 20): Promise<{ attempted: number }> {
    if (!this.config.get<string>('AGROCLOUD_EVENT_URL')) return { attempted: 0 };
    const due = await this.events.find({ status: 'PENDING', nextAttemptAt: { $lte: new Date() } }).sort({ createdAt: 1 }).limit(limit);
    for (const event of due) await this.dispatchOne(event.eventKey);
    return { attempted: due.length };
  }
  private async dispatchOne(eventKey: string): Promise<void> {
    const url = this.config.get<string>('AGROCLOUD_EVENT_URL');
    if (!url) return;
    const event = await this.events.findOne({ eventKey, status: 'PENDING', nextAttemptAt: { $lte: new Date() } });
    if (!event) return;
    const body = JSON.stringify(event.payload);
    const signature = createHmac('sha256', this.config.getOrThrow<string>('AGROCLOUD_EVENT_SECRET')).update(body).digest('hex');
    try {
      const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/json', 'X-AgroCloud-Signature': `sha256=${signature}`, 'X-Event-Id': eventKey }, body });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await this.events.updateOne({ eventKey, status: 'PENDING' }, { $set: { status: 'DELIVERED', deliveredAt: new Date(), lastError: null }, $inc: { attempts: 1 } });
    } catch (error: unknown) {
      const attempts = event.attempts + 1;
      const delay = Math.min(3600000, 15000 * (2 ** Math.min(attempts, 8)));
      await this.events.updateOne({ eventKey, status: 'PENDING' }, { $set: { lastError: String(error).slice(0, 160), nextAttemptAt: new Date(Date.now() + delay) }, $inc: { attempts: 1 } });
      this.logger.warn(`No se entregó ${eventKey}; se reintentará`);
    }
  }
}
