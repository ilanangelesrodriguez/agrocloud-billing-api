import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HealthService } from './health.service.js';

@ApiExcludeController()
@Controller('api/v1/health')
export class LegacyHealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  check() {
    return this.health.check();
  }

  @Get('ready')
  ready() {
    return this.health.ready();
  }
}
