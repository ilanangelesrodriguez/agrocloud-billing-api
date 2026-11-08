import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, Express } from 'express';
import { AppModule } from './app.module.js';
import { configureApplication } from './bootstrap/application.js';
import { ConfigService } from '@nestjs/config';
import { errorResponse } from './common/http/api-response.js';

let serverPromise: Promise<Express> | undefined;

async function createApplication(): Promise<Express> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: false,
    rawBody: true,
    bodyParser: true,
  });

  configureApplication(app);

  if (process.env.VERCEL === '1') {
    await app.init();
  } else {
    app.enableShutdownHooks();
    await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'), '0.0.0.0');
  }

  return app.getHttpAdapter().getInstance() as Express;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    serverPromise ??= createApplication().catch((error: unknown) => {
      serverPromise = undefined;
      throw error;
    });

    const server = await serverPromise;
    server(req, res);
  } catch (error) {
    console.error('Error al iniciar AgroCloud Billing API:', error);

    if (!res.headersSent) {
      res.setHeader('Cache-Control', 'no-store');
      res
        .status(503)
        .json(
          errorResponse(
            res,
            503,
            'SERVICE_UNAVAILABLE',
            'El servicio no está disponible temporalmente.',
          ),
        );
    }
  }
}

if (process.env.VERCEL !== '1') {
  void createApplication().catch((error: unknown) => {
    console.error('Error al iniciar AgroCloud Billing API:', error);
    process.exitCode = 1;
  });
}
