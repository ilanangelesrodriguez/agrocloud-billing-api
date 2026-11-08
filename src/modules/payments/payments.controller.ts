import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ServiceKeyGuard } from '../../common/auth/service-key.guard.js';
import { CreateChargeDto } from './create-charge.dto.js';
import { PaymentsService } from './payments.service.js';
@ApiTags('Pagos') @ApiSecurity('service-key') @UseGuards(ServiceKeyGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Post('charges') charge(@Body() dto: CreateChargeDto) { return this.payments.charge(dto); }
  @Get(':reference') status(@Param('reference') reference: string) { return this.payments.status(reference); }
  @Post(':reference/reconcile') reconcile(@Param('reference') reference: string) { return this.payments.reconcile(reference); }
}
