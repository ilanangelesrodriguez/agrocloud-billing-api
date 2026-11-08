import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { CulqiService } from '../../integrations/culqi/culqi.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { Refund } from './schemas/refund.schema.js';
import { RefundDto } from './dto/refund.dto.js';

@Injectable()
export class RefundsService {
  constructor(
    @InjectModel(Refund.name) private readonly refunds: Model<Refund>,
    private readonly orders: OrdersService,
    private readonly culqi: CulqiService,
  ) {}

  async request(dto: RefundDto): Promise<Record<string, unknown>> {
    const order = await this.orders.find(dto.externalReference);
    if (order.status !== 'PAID' || !order.culqiChargeId)
      throw new ConflictException('Solo se puede devolver un pago confirmado');
    try {
      await this.refunds.create({
        orderReference: order.externalReference,
        chargeId: order.culqiChargeId,
        amountCents: order.amountCents,
        reason: dto.reason,
        status: 'PROCESSING',
      });
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000)
        throw new ConflictException('Ya existe solicitud de reembolso para esta orden');
      throw error;
    }
    try {
      const provider = await this.culqi.refund({
        chargeId: order.culqiChargeId,
        amountCents: order.amountCents,
        reason: dto.reason,
      });
      await this.refunds.updateOne(
        { orderReference: order.externalReference },
        {
          $set: {
            providerRefundId: typeof provider.id === 'string' ? provider.id : undefined,
            status: 'PENDING_VERIFICATION',
          },
        },
      );
      return {
        orderReference: order.externalReference,
        status: 'PENDING_VERIFICATION',
        providerRefundId: provider.id ?? null,
      };
    } catch {
      await this.refunds.updateOne(
        { orderReference: order.externalReference },
        { $set: { status: 'REVIEW_REQUIRED' } },
      );
      throw new ConflictException(
        'Resultado del reembolso indeterminado. Verifica Culqi antes de reintentar.',
      );
    }
  }

  async find(reference: string) {
    const refund = await this.refunds.findOne({ orderReference: reference });
    if (!refund) throw new NotFoundException('Reembolso no encontrado');
    return refund;
  }
}
