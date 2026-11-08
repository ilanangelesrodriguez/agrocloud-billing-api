import type { SchemaObject } from '@nestjs/swagger';

export const healthSchema: SchemaObject = {
  type: 'object',
  required: ['status', 'service', 'version'],
  properties: {
    status: { type: 'string', example: 'ok' },
    service: { type: 'string', example: 'agrocloud-billing-api' },
    version: { type: 'string', example: '0.1.0' },
  },
};

export const readinessSchema: SchemaObject = {
  ...healthSchema,
  properties: {
    ...healthSchema.properties,
    dependencies: { type: 'object', properties: { mongodb: { type: 'string', example: 'up' } } },
  },
};
