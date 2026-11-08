import {
  ApiContract,
  orderSchema,
  referenceParameter,
} from '../../common/decorators/api-contract.decorator.js';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ServiceKeyGuard } from '../../common/auth/service-key.guard.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrdersService } from './orders.service.js';

@ApiTags('Órdenes')
@ApiSecurity('service-key')
@UseGuards(ServiceKeyGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @ApiContract(
    'Crear una orden',
    'Idempotente por externalReference. Una referencia existente con otros datos devuelve 409.',
    orderSchema,
    201,
  )
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  @referenceParameter()
  @ApiContract(
    'Consultar una orden',
    'Devuelve los datos y el estado persistido de la orden.',
    orderSchema,
  )
  @Get(':reference')
  find(@Param('reference') reference: string) {
    return this.orders.find(reference);
  }
}
