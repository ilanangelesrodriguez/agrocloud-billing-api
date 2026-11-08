import { Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { map } from 'rxjs';
import { responseMeta } from '../http/api-response.js';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data: unknown) => ({
        success: true,
        statusCode: response.statusCode,
        data: data ?? null,
        meta: responseMeta(response),
      })),
    );
  }
}
