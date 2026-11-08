import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { errorResponse, requestId } from '../http/api-response.js';

const errors: Record<number, { code: string; message: string }> = {
  400: { code: 'BAD_REQUEST', message: 'La solicitud no es válida.' },
  401: { code: 'UNAUTHORIZED', message: 'Credenciales ausentes o inválidas.' },
  403: { code: 'FORBIDDEN', message: 'No tienes permiso para realizar esta operación.' },
  404: { code: 'NOT_FOUND', message: 'El recurso o la ruta solicitada no existe.' },
  405: { code: 'METHOD_NOT_ALLOWED', message: 'Método HTTP no permitido.' },
  409: { code: 'CONFLICT', message: 'La operación entra en conflicto con el estado actual.' },
  413: {
    code: 'PAYLOAD_TOO_LARGE',
    message: 'El cuerpo de la solicitud supera el límite permitido.',
  },
  415: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'El formato de la solicitud no es compatible.' },
  422: { code: 'UNPROCESSABLE_ENTITY', message: 'No se pudo procesar la operación.' },
  429: { code: 'TOO_MANY_REQUESTS', message: 'Demasiadas solicitudes. Intenta más tarde.' },
  500: {
    code: 'INTERNAL_ERROR',
    message: 'Ocurrió un error interno. Usa el identificador de solicitud para reportarlo.',
  },
  502: { code: 'BAD_GATEWAY', message: 'El proveedor no pudo completar la operación.' },
  503: { code: 'SERVICE_UNAVAILABLE', message: 'El servicio no está disponible temporalmente.' },
  504: { code: 'GATEWAY_TIMEOUT', message: 'El proveedor no respondió a tiempo.' },
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) return;

    const parserError = exception as { type?: unknown; status?: unknown } | null;
    const parserStatus =
      parserError?.type === 'entity.parse.failed' && parserError.status === 400
        ? 400
        : parserError?.type === 'entity.too.large' && parserError.status === 413
          ? 413
          : 500;
    const status = exception instanceof HttpException ? exception.getStatus() : parserStatus;
    const fallback = errors[status] ?? errors[500]!;
    let code = fallback.code;
    let message = fallback.message;
    let details: string[] | undefined;

    if (exception instanceof HttpException && status !== 404 && status < 500) {
      const body = exception.getResponse();
      const value: unknown =
        typeof body === 'string' ? body : (body as { message?: unknown }).message;
      if (Array.isArray(value)) {
        details = value.filter((item): item is string => typeof item === 'string');
        code = 'VALIDATION_ERROR';
        message = 'Revisa los campos de la solicitud.';
      } else if (typeof value === 'string' && [401, 403, 409, 422].includes(status)) {
        message = value;
      }
    }

    if (status >= 500) {
      this.logger.error({
        requestId: requestId(response),
        statusCode: status,
        errorType: exception instanceof Error ? exception.name : 'UnknownError',
      });
    }

    response.status(status).json(errorResponse(response, status, code, message, details));
  }
}
