import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ServiceKeyGuard } from '../../common/auth/service-key.guard.js';
import { CreateOrderDto } from './create-order.dto.js';
import { OrdersService } from './orders.service.js';
@ApiTags('Órdenes') @ApiSecurity('service-key') @UseGuards(ServiceKeyGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Post() create(@Body() dto: CreateOrderDto) { return this.orders.create(dto); }
  @Get(':reference') find(@Param('reference') reference: string) { return this.orders.find(reference); }
}
