import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { BillingOrder } from './schemas/order.schema.js';

@Injectable()
export class OrdersService {
  constructor(@InjectModel(BillingOrder.name) private readonly model: Model<BillingOrder>) {}

  async create(dto: CreateOrderDto): Promise<BillingOrder> {
    const existing = await this.model.findOne({ externalReference: dto.externalReference });
    if (existing) return this.same(existing, dto);
    try {
      return await this.model.create({ ...dto, status: 'PENDING' });
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        const raced = await this.model.findOne({ externalReference: dto.externalReference });
        if (raced) return this.same(raced, dto);
      }
      throw error;
    }
  }

  private same(order: BillingOrder, dto: CreateOrderDto): BillingOrder {
    if (
      order.companyId !== dto.companyId ||
      order.kind !== dto.kind ||
      order.amountCents !== dto.amountCents ||
      order.currency !== dto.currency ||
      order.customerEmail !== dto.customerEmail ||
      order.description !== dto.description
    )
      throw new ConflictException('La referencia ya existe con datos diferentes');
    return order;
  }

  async find(reference: string): Promise<BillingOrder> {
    const order = await this.model.findOne({ externalReference: reference });
    if (!order) throw new NotFoundException('Orden no encontrada');
    return order;
  }
}
