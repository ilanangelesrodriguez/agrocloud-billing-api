import { applyDecorators } from '@nestjs/common';
import { failureSchema, successSchema } from '../http/api-response.schemas.js';

import { ApiOperation, ApiResponse, ApiParam, type SchemaObject } from '@nestjs/swagger';

export const referenceParameter = () =>
  ApiParam({
    name: 'reference',
    description: 'Referencia comercial única de AgroCloud.',

    schema: {
      type: 'string',
      pattern: '^[A-Za-z0-9_-]{8,36}$',
      example: 'AGRO-ORDER-000125',
    },
  });

const text = (example: string): SchemaObject => ({ type: 'string', example });

export const orderSchema: SchemaObject = {
  type: 'object',
  required: ['externalReference', 'companyId', 'kind', 'amountCents', 'currency', 'status'],

  properties: {
    externalReference: text('AGRO-ORDER-000125'),
    companyId: { type: 'integer', example: 25 },

    kind: {
      type: 'string',
      enum: ['PLAN', 'RENEWAL', 'USER_ADDON', 'AI_ADDON', 'LOT_ADDON'],
    },

    amountCents: {
      type: 'integer',
      example: 7900,
      description: 'Importe en céntimos de PEN.',
    },

    currency: { type: 'string', enum: ['PEN'] },
    customerEmail: text('responsable@empresa.pe'),

    description: text('Plan Profesional - 1 mes'),

    status: {
      type: 'string',
      enum: ['PENDING', 'PROCESSING', 'PAID', 'UNKNOWN', 'REFUNDED'],
    },

    culqiChargeId: text('chr_test_example'),
    paidAt: { type: 'string', format: 'date-time' },

    _id: text('507f1f77bcf86cd799439011'),
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const paymentSchema: SchemaObject = {
  type: 'object',
  properties: {
    orderReference: text('AGRO-ORDER-000125'),
    status: {
      type: 'string',
      enum: ['PENDING', 'PROCESSING', 'PAID', 'UNKNOWN', 'REFUNDED'],
    },

    chargeId: { ...text('chr_test_example'), nullable: true },
    lastAttempt: {
      type: 'string',
      nullable: true,
      enum: ['PROCESSING', 'SUCCEEDED', 'DECLINED', 'UNKNOWN'],
    },

    detail: { type: 'string' },
    notification: { type: 'string', enum: ['PENDING_RETRY'] },
  },
};

export const refundSchema: SchemaObject = {
  type: 'object',
  properties: {
    orderReference: text('AGRO-ORDER-000125'),
    chargeId: text('chr_test_example'),

    amountCents: { type: 'integer', example: 7900 },
    reason: text('solicitud_comprador'),

    status: {
      type: 'string',
      enum: ['PROCESSING', 'PENDING_VERIFICATION', 'REVIEW_REQUIRED'],
    },

    providerRefundId: { type: 'string', nullable: true },

    _id: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export function ApiContract(
  summary: string,
  description: string,
  schema: SchemaObject,
  status = 200,
  secured = true,
) {
  const errors = secured ? [400, 401, 404, 409, 422, 500, 503] : [400, 500, 503];

  return applyDecorators(
    ApiOperation({ summary, description }),

    ApiResponse({
      status,
      description: 'Operación completada. Consulta el estado de negocio en el cuerpo.',
      schema: successSchema(schema, status),
      headers: {
        'X-Request-Id': {
          description: 'Identificador de la solicitud.',
          schema: { type: 'string', format: 'uuid' },
        },
      },
    }),

    ...errors.map((code) =>
      ApiResponse({
        status: code,
        description: (
          {
            400: 'Solicitud inválida.',
            401: 'Credencial ausente o inválida.',
            404: 'Recurso no encontrado.',
            409: 'Conflicto de estado o resultado indeterminado; no repetir el cargo.',
            422: 'Cargo rechazado por el proveedor.',
            500: 'Error interno del servidor.',
            503: 'Dependencia no disponible.',
          } as Record<number, string>
        )[code],
        schema: failureSchema(code),
        headers: {
          'X-Request-Id': {
            description: 'Identificador para soporte y seguimiento.',
            schema: { type: 'string', format: 'uuid' },
          },
        },
      }),
    ),
  );
}
