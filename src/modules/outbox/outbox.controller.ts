import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ServiceKeyGuard } from '../../common/auth/service-key.guard.js';
import { OutboxService } from './outbox.service.js';
@ApiTags('Eventos internos') @ApiSecurity('service-key') @UseGuards(ServiceKeyGuard)
@Controller('internal/outbox')
export class OutboxController {
  constructor(private readonly outbox: OutboxService) {}
  @Post('dispatch') dispatch() { return this.outbox.dispatchDue(); }
}
