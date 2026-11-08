import { RequestMethod, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import { requestId } from '../common/http/api-response.js';
import { ApiResponseInterceptor } from '../common/interceptors/api-response.interceptor.js';
import { ApiExceptionFilter } from '../common/filters/api-exception.filter.js';
import { configureSwagger } from './swagger.js';

export function configureApplication(app: NestExpressApplication): void {
  app.disable('x-powered-by');
  app.use((_request: Request, response: Response, next: NextFunction) => {
    requestId(response);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.setGlobalPrefix('api/v1', {
    exclude: ['', 'api/v1', 'health', 'ready', 'api/v1/health', 'api/v1/health/ready'].map(
      (path) => ({ path, method: RequestMethod.GET }),
    ),
  });
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
    }),
  );
  configureSwagger(app);
}
