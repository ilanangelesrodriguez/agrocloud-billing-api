import type { SchemaObject } from '@nestjs/swagger';

const metaSchema: SchemaObject = {
  type: 'object',
  required: ['requestId', 'timestamp'],
  properties: {
    requestId: { type: 'string', format: 'uuid', example: '9b3f4900-d861-4a74-8db9-e174cd284f1d' },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

export function successSchema(data: SchemaObject, statusCode: number): SchemaObject {
  return {
    type: 'object',
    required: ['success', 'statusCode', 'data', 'meta'],
    properties: {
      success: { type: 'boolean', enum: [true] },
      statusCode: { type: 'integer', example: statusCode },
      data,
      meta: metaSchema,
    },
  };
}

export function failureSchema(statusCode: number): SchemaObject {
  return {
    type: 'object',
    required: ['success', 'statusCode', 'error', 'meta'],
    properties: {
      success: { type: 'boolean', enum: [false] },
      statusCode: { type: 'integer', example: statusCode },
      error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: {
            type: 'string',
            description: 'Código estable para gestionar el error desde el cliente.',
          },
          message: { type: 'string', description: 'Descripción legible del error.' },
          details: {
            type: 'array',
            items: { type: 'string' },
            description: 'Errores de validación, cuando corresponde.',
          },
        },
      },
      meta: metaSchema,
    },
  };
}
