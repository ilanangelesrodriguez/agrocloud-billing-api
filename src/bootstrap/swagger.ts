import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Express, Response } from 'express';

export function configureSwagger(app: NestExpressApplication): void {
  const config = app.get(ConfigService);

  if (!config.get<boolean>('SWAGGER_ENABLED', true)) {
    return;
  }

  const definition = new DocumentBuilder()
    .setTitle('AgroCloud · Billing API')
    .setDescription(
      [
        'API privada de pagos, órdenes, reembolsos y eventos con Culqi para AgroCloud.',
        '## Integración',
        'Crea una orden, tokeniza con Culqi Checkout y solicita el cargo desde el backend con `x-service-key`.',
        'Ante `UNKNOWN`, concilia antes de reintentar. Un HTTP 2xx indica que la petición fue procesada; revisa siempre el estado de negocio dentro de `data`.',
        '## Respuestas',
        'Éxito: `{ success: true, statusCode, data, meta }`. Error: `{ success: false, statusCode, error: { code, message, details? }, meta }`.',
        '`meta` incluye `requestId` y `timestamp` UTC. El identificador también se devuelve en `X-Request-Id`.',
        'Los errores de validación usan `VALIDATION_ERROR` con detalles de los campos. Los errores internos no exponen información del servidor.',
        '## Rutas',
        '`/` presenta el servicio; `/health` verifica el proceso; `/ready` verifica MongoDB. Las operaciones comerciales usan `/api/v1`.',
      ].join('\n\n'),
    )
    .setVersion('0.1.0')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-service-key',
        description: 'Clave privada del backend AgroCloud',
      },
      'service-key',
    )
    .addTag('Órdenes', 'Órdenes de cobro')
    .addTag('Pagos', 'Cargos y conciliación con Culqi')
    .addTag('Reembolsos', 'Solicitudes de devolución')
    .addTag('Culqi Webhooks', 'Eventos de Culqi')
    .addTag('Eventos internos', 'Eventos hacia Laravel')
    .addTag('Servicio', 'Descubrimiento, disponibilidad del proceso y de MongoDB')
    .build();

  const document = SwaggerModule.createDocument(app, definition, {
    operationIdFactory: (controller, method) => `${controller.replace('Controller', '')}_${method}`,
  });

  SwaggerModule.setup('docs', app, document, {
    ui: false,
    raw: ['json'],
    jsonDocumentUrl: '/openapi.json',
  });

  const express = app.getHttpAdapter().getInstance() as Express;

  express.get('/docs-json', (_req, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(document);
  });

  express.get('/docs', (_req, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');

    res.type('html').send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AgroCloud | Billing API</title>
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.15/swagger-ui.css"
  />
  <style>
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 32px 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>

  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.15/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.15/swagger-ui-standalone-preset.js"></script>

  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: false,
        validatorUrl: null,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout",
        filter: true,
        displayRequestDuration: true,
        docExpansion: "none",
        supportedSubmitMethods: [
          "get",
          "post",
          "put",
          "patch",
          "delete",
        ],
      });
    };
  </script>
</body>
</html>
    `);
  });
}
