import { Module } from '@nestjs/common';
import { LegacyHealthController } from './legacy-health.controller.js';
import { ServiceController } from './service.controller.js';
import { HealthService } from './health.service.js';

@Module({ controllers: [LegacyHealthController, ServiceController], providers: [HealthService] })
export class HealthModule {}
