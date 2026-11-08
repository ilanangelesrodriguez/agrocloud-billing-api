import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { equalSecret } from '../../common/auth/service-key.guard.js';
import { parseCulqiData } from '../../common/utils/charge-verification.js';
import { CulqiService } from '../culqi/culqi.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import { WebhookEvent } from './webhook-event.schema.js';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  constructor(
    @InjectModel(WebhookEvent.name) private readonly events: Model<WebhookEvent>,
    private readonly config: ConfigService,
    private readonly culqi: CulqiService,
    private readonly payments: PaymentsService,
  ) {}
  async process(token: string, body: unknown): Promise<Record<string, unknown>> {
    if (!equalSecret(token, this.config.getOrThrow<string>('CULQI_WEBHOOK_TOKEN')))
      throw new UnauthorizedException('Webhook no autorizado');
    const data = parseCulqiData(body);
    if (!data || typeof data.id !== 'string' || typeof data.type !== 'string') return { accepted: false, reason: 'invalid_event' };
    const payload = parseCulqiData(data.data);
    const objectId = typeof payload?.id === 'string' ? payload.id : '';
    let event: WebhookEvent;
    try { event = await this.events.create({ providerEventId: data.id, type: data.type, status: 'RECEIVED', providerObjectId: objectId }); }
    catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) return { accepted: true, duplicate: true };
      throw error;
    }
    try {
      // Los webhooks NO son prueba de pago: recuperar cargo desde API Culqi.
      if (!['charge.creation.succeeded', 'charge.succeeded'].includes(event.type) || !/^chr_(test|live)_[A-Za-z0-9]+$/.test(objectId)) {
        await this.events.updateOne({ providerEventId: data.id }, { $set: { status: 'IGNORED' } });
        return { accepted: true, ignored: true };
      }
      const charge = await this.culqi.getCharge(objectId);
      const reference = charge.metadata?.external_reference;
      if (typeof reference !== 'string') {
        await this.events.updateOne({ providerEventId: data.id }, { $set: { status: 'REVIEW', note: 'Referencia faltante' } });
        return { accepted: true, review: true };
      }
      await this.payments.finalizeVerifiedCharge(reference, charge);
      await this.events.updateOne({ providerEventId: data.id }, { $set: { status: 'PROCESSED' } });
      return { accepted: true, processed: true };
    } catch (error: unknown) {
      await this.events.updateOne({ providerEventId: data.id }, { $set: { status: 'REVIEW', note: 'Requiere conciliación' } });
      this.logger.warn(`Webhook ${data.id} requiere conciliación: ${String(error).slice(0, 140)}`);
      return { accepted: true, review: true };
    }
  }
}
