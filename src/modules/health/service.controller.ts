import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { HealthService } from './health.service.js';
import { healthSchema, readinessSchema } from './health.schemas.js';

@ApiTags('Servicio')
@Controller()
export class ServiceController {
  constructor(
    private readonly health: HealthService,
    private readonly config: ConfigService,
  ) {}

  @ApiContract(
    'Descubrir la API',
    'Punto de entrada con enlaces de documentación y operación.',
    {
      type: 'object',
      properties: {
        service: { type: 'string', example: 'agrocloud-billing-api' },
        version: { type: 'string', example: '0.1.0' },
        description: { type: 'string' },
        links: {
          type: 'object',
          properties: {
            documentation: { type: 'string', nullable: true, example: '/docs' },
            openapi: { type: 'string', nullable: true, example: '/openapi.json' },
            health: { type: 'string', example: '/health' },
            ready: { type: 'string', example: '/ready' },
            api: { type: 'string', example: '/api/v1' },
          },
        },
      },
    },
    200,
    false,
  )
  @Get()
  index() {
    const docsEnabled = this.config.get<boolean>('SWAGGER_ENABLED', true);
    return {
      service: 'agrocloud-billing-api',
      version: '0.1.0',
      description: 'API privada de órdenes, pagos y reembolsos de AgroCloud.',
      links: {
        documentation: docsEnabled ? '/docs' : null,
        openapi: docsEnabled ? '/openapi.json' : null,
        health: '/health',
        ready: '/ready',
        api: '/api/v1',
      },
    };
  }

  @ApiExcludeEndpoint()
  @Get('api/v1')
  versionIndex() {
    return this.index();
  }

  @ApiContract(
    'Comprobar el proceso',
    'Liveness. No consulta proveedores externos.',
    healthSchema,
    200,
    false,
  )
  @Get('health')
  check() {
    return this.health.check();
  }

  @ApiContract(
    'Comprobar MongoDB',
    'Readiness. Devuelve 503 si MongoDB no está disponible; no verifica Culqi.',
    readinessSchema,
    200,
    false,
  )
  @Get('ready')
  ready() {
    return this.health.ready();
  }
}
