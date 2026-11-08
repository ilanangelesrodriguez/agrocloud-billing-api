import {
  ApiContract,
  refundSchema,
  referenceParameter,
} from '../../common/decorators/api-contract.decorator.js';

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { ApiSecurity, ApiTags } from '@nestjs/swagger';

import { ServiceKeyGuard } from '../../common/auth/service-key.guard.js';

import { RefundDto } from './dto/refund.dto.js';

import { RefundsService } from './refunds.service.js';

@ApiTags('Reembolsos')
@ApiSecurity('service-key')
@UseGuards(ServiceKeyGuard)
@Controller('refunds')
export class RefundsController {
  constructor(private readonly service: RefundsService) {}

  @ApiContract(
    'Solicitar un reembolso total',
    'Solo pagos PAID. Una solicitud por orden. PENDING_VERIFICATION no acredita una devolución completada.',
    refundSchema,
    201,
  )
  @Post()
  request(@Body() dto: RefundDto) {
    return this.service.request(dto);
  }

  @referenceParameter()
  @ApiContract('Consultar un reembolso', 'Consulta el estado local de la solicitud.', refundSchema)
  @Get(':reference')
  find(@Param('reference') reference: string) {
    return this.service.find(reference);
  }
}
