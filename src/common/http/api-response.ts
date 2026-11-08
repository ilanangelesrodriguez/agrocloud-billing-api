import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

export function requestId(response: Response): string {
  const existing: unknown = response.locals.requestId;
  if (typeof existing === 'string') return existing;

  const id = randomUUID();
  response.locals.requestId = id;
  response.setHeader('X-Request-Id', id);
  return id;
}

export function responseMeta(response: Response) {
  return { requestId: requestId(response), timestamp: new Date().toISOString() };
}

export function errorResponse(
  response: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: string[],
) {
  return {
    success: false,
    statusCode,
    error: { code, message, ...(details?.length ? { details } : {}) },
    meta: responseMeta(response),
  };
}
