import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ServiceKeyGuard } from '../../common/auth/service-key.guard.js';
import { RefundDto } from './refund.dto.js';
import { RefundsService } from './refunds.service.js';
@ApiTags('Reembolsos') @ApiSecurity('service-key') @UseGuards(ServiceKeyGuard)
@Controller('refunds')
export class RefundsController {
  constructor(private readonly service: RefundsService) {}
  @Post() request(@Body() dto: RefundDto) { return this.service.request(dto); }
  @Get(':reference') find(@Param('reference') reference: string) { return this.service.find(reference); }
}
