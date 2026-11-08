import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { chargeMatchesOrder, ChargeSnapshot } from '../../common/utils/charge-verification.js';
import { CulqiHttpError, CulqiService } from '../../integrations/culqi/culqi.service.js';
import { BillingOrder } from '../orders/schemas/order.schema.js';
import { OrdersService } from '../orders/orders.service.js';
import { OutboxService } from '../../infrastructure/outbox/outbox.service.js';
import { CreateChargeDto } from './dto/create-charge.dto.js';
import { PaymentAttempt } from './schemas/payment-attempt.schema.js';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(BillingOrder.name)
    private readonly ordersModel: Model<BillingOrder>,
    @InjectModel(PaymentAttempt.name)
    private readonly attempts: Model<PaymentAttempt>,
    private readonly orders: OrdersService,
    private readonly culqi: CulqiService,
    private readonly outbox: OutboxService,
  ) {}

  async charge(dto: CreateChargeDto): Promise<Record<string, unknown>> {
    const order = await this.orders.find(dto.externalReference);
    const claimed = await this.ordersModel.findOneAndUpdate(
      { externalReference: dto.externalReference, status: 'PENDING' },
      { $set: { status: 'PROCESSING' } },
      { new: true },
    );
    if (!claimed)
      throw new ConflictException(
        `No se puede cobrar una orden con estado ${order.status}; consulta el pago o reconcilia antes de reintentar`,
      );

    const attempt = await this.attempts
      .create({ orderReference: order.externalReference, status: 'PROCESSING' })
      .catch(async (error: unknown) => {
        await this.ordersModel.updateOne(
          {
            externalReference: order.externalReference,
            status: 'PROCESSING',
            culqiChargeId: { $exists: false },
          },
          { $set: { status: 'PENDING' } },
        );
        throw error;
      });
    let chargeCreated = false;
    try {
      const result = await this.culqi.charge({
        tokenId: dto.tokenId,
        amountCents: order.amountCents,
        email: order.customerEmail,
        description: order.description,
        reference: order.externalReference,
      });
      chargeCreated = true;
      if (!result.id) throw new Error('Culqi no devolvió identificador de cargo');
      await this.ordersModel.updateOne(
        { externalReference: order.externalReference },
        { $set: { culqiChargeId: result.id } },
      );
      await this.attempts.updateOne({ _id: attempt._id }, { $set: { culqiChargeId: result.id } });

      const verified = await this.culqi.getCharge(result.id);
      if (!chargeMatchesOrder(verified, order))
        throw new Error('El cargo requiere revisión o autenticación adicional');
      await this.finalizeVerifiedCharge(order.externalReference, verified);
      await this.attempts.updateOne({ _id: attempt._id }, { $set: { status: 'SUCCEEDED' } });
      return {
        status: 'PAID',
        orderReference: order.externalReference,
        chargeId: verified.id,
      };
    } catch (error: unknown) {
      const declined = !chargeCreated && error instanceof CulqiHttpError && error.definitive;

      const current = await this.ordersModel.findOne({
        externalReference: order.externalReference,
      });
      if (current?.status === 'PAID') {
        await this.attempts.updateOne({ _id: attempt._id }, { $set: { status: 'SUCCEEDED' } });
        return {
          status: 'PAID',
          orderReference: order.externalReference,
          chargeId: current.culqiChargeId,
          notification: 'PENDING_RETRY',
        };
      }
      await this.ordersModel.updateOne(
        { externalReference: order.externalReference, status: 'PROCESSING' },
        { $set: { status: declined ? 'PENDING' : 'UNKNOWN' } },
      );
      await this.attempts.updateOne(
        { _id: attempt._id },
        {
          $set: {
            status: declined ? 'DECLINED' : 'UNKNOWN',
            errorCode: declined ? `HTTP_${error.status}` : 'RECONCILE_REQUIRED',
          },
        },
      );
      if (declined)
        throw new UnprocessableEntityException(
          'Culqi rechazó el cargo. Puedes utilizar otro token para reintentar.',
        );
      throw new ConflictException(
        'Resultado indeterminado: no repitas el cobro; primero reconcilia el estado con Culqi.',
      );
    }
  }

  async finalizeVerifiedCharge(
    reference: string,
    verified: ChargeSnapshot,
  ): Promise<{ status: string }> {
    const order = await this.orders.find(reference);
    if (!chargeMatchesOrder(verified, order))
      throw new ConflictException(
        'El cargo no coincide con el importe, moneda o referencia de la orden',
      );
    const updated = await this.ordersModel.findOneAndUpdate(
      { externalReference: reference, status: { $nin: ['PAID', 'REFUNDED'] } },
      {
        $set: {
          status: 'PAID',
          paidAt: new Date(),
          culqiChargeId: verified.id,
        },
      },
      { new: true },
    );
    const paid = updated ?? (await this.orders.find(reference));
    if (paid.status !== 'PAID') throw new ConflictException('La orden no admite esta confirmación');

    await this.outbox.enqueuePayment(paid);
    return { status: 'PAID' };
  }

  async reconcile(reference: string): Promise<Record<string, unknown>> {
    const order = await this.orders.find(reference);
    if (order.status === 'PAID') {
      await this.outbox.enqueuePayment(order);
      return { status: order.status, orderReference: reference };
    }
    if (!order.culqiChargeId)
      return {
        status: 'UNKNOWN',
        detail:
          'No existe ID de cargo; revisar operación en Culqi Panel antes de permitir otro intento',
      };
    const verified = await this.culqi.getCharge(order.culqiChargeId);
    if (chargeMatchesOrder(verified, order))
      return await this.finalizeVerifiedCharge(reference, verified);
    return {
      status: 'UNKNOWN',
      detail: 'El proveedor no confirma una venta exitosa',
    };
  }

  async status(reference: string): Promise<Record<string, unknown>> {
    const order = await this.orders.find(reference);
    const latest = await this.attempts
      .findOne({ orderReference: reference })
      .sort({ createdAt: -1 });
    return {
      orderReference: reference,
      status: order.status,
      chargeId: order.culqiChargeId ?? null,
      lastAttempt: latest?.status ?? null,
    };
  }
}
