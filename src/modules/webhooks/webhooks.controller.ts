import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service.js';
@ApiTags('Culqi Webhooks')
@Controller('webhooks/culqi')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}
  // URL registrada en Culqi Panel: /api/v1/webhooks/culqi/<token aleatorio>
  // No se confía en el contenido del evento: SIEMPRE se consulta el cargo real al proveedor.
  @Post(':token') receive(@Param('token') token: string, @Body() body: unknown) { return this.webhooks.process(token, body); }
}
