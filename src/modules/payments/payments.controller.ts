import {
  ApiContract,
  paymentSchema,
  referenceParameter,
} from '../../common/decorators/api-contract.decorator.js';

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { ApiSecurity, ApiTags } from '@nestjs/swagger';

import { ServiceKeyGuard } from '../../common/auth/service-key.guard.js';

import { CreateChargeDto } from './dto/create-charge.dto.js';

import { PaymentsService } from './payments.service.js';

@ApiTags('Pagos')
@ApiSecurity('service-key')
@UseGuards(ServiceKeyGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @ApiContract(
    'Cobrar con token Culqi',
    'El importe procede de la orden. Solo PENDING admite cobros. UNKNOWN requiere conciliación antes de reintentar.',
    paymentSchema,
    201,
  )
  @Post('charges')
  charge(@Body() dto: CreateChargeDto) {
    return this.payments.charge(dto);
  }

  @referenceParameter()
  @ApiContract(
    'Consultar un pago',
    'Estado local e intento más reciente; no genera un nuevo cargo.',
    paymentSchema,
  )
  @Get(':reference')
  status(@Param('reference') reference: string) {
    return this.payments.status(reference);
  }

  @referenceParameter()
  @ApiContract(
    'Conciliar un pago',
    'Consulta el cargo existente en Culqi. Si falta su identificador, requiere revisión manual en Culqi Panel.',
    paymentSchema,
    201,
  )
  @Post(':reference/reconcile')
  reconcile(@Param('reference') reference: string) {
    return this.payments.reconcile(reference);
  }
}
