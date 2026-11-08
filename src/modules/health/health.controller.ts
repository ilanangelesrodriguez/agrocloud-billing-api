import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { InjectConnection } from '@nestjs/mongoose';

import type { Connection } from 'mongoose';

import { ApiTags } from '@nestjs/swagger';

import { ApiContract } from '../../common/decorators/api-contract.decorator.js';

const healthSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', example: 'ok' },

    service: { type: 'string', example: 'agrocloud-billing-api' },

    version: { type: 'string', example: '0.1.0' },
  },
};

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @ApiContract(
    'Comprobar disponibilidad del proceso',
    'Liveness: no consulta proveedores externos.',
    healthSchema,
    200,
    false,
  )
  @Get()
  check() {
    return { status: 'ok', service: 'agrocloud-billing-api', version: '0.1.0' };
  }

  @ApiContract(
    'Comprobar disponibilidad de MongoDB',
    'Readiness: ejecuta ping a MongoDB; devuelve 503 si no está disponible. No verifica Culqi.',
    healthSchema,
    200,
    false,
  )
  @Get('ready')
  async ready() {
    try {
      if (this.connection.readyState !== 1 || !this.connection.db) throw new Error('Disconnected');

      await this.connection.db.admin().ping({ timeoutMS: 2000 });

      return this.check();
    } catch {
      throw new ServiceUnavailableException('Base de datos no disponible');
    }
  }
}
