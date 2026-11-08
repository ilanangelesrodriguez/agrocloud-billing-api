import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get() check() { return { status: 'ok', service: 'agrocloud-billing-api', version: '0.1.0' }; }
}
