import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { ServiceKeyGuard } from '../../common/auth/service-key.guard.js';
import { OutboxService } from './outbox.service.js';

@ApiTags('Eventos internos')
@ApiSecurity('service-key')
@UseGuards(ServiceKeyGuard)
@Controller('internal/outbox')
export class OutboxController {
  constructor(private readonly outbox: OutboxService) {}

  @ApiContract(
    'Entregar eventos pendientes',
    'Procesa hasta 20 eventos vencidos, con concurrencia limitada y bloqueo temporal. En serverless debe invocarlo un programador externo autenticado.',
    {
      type: 'object',
      properties: { attempted: { type: 'integer', example: 4 } },
    },
    200,
  )
  @HttpCode(200)
  @Post('dispatch')
  dispatch() {
    return this.outbox.dispatchDue();
  }
}
