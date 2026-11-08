import type { Request, Response, NextFunction } from "express";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { equalSecret } from "../common/auth/service-key.guard.js";

/** Documentation has its own credentials; the billing key never grants docs access. */
export function configureSwagger(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  if (!config.get<boolean>("SWAGGER_ENABLED", true)) return;

  app.use(
    ["/docs", "/docs-json"],
    (req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      const password = config.get<string>("SWAGGER_PASSWORD");
      if (!password) return next();
      const authorization = req.headers.authorization;
      const credentials = authorization?.startsWith("Basic ")
        ? Buffer.from(authorization.slice(6), "base64").toString("utf8")
        : "";
      const separator = credentials.indexOf(":");
      const validUser = equalSecret(
        credentials.slice(0, separator),
        config.get<string>("SWAGGER_USERNAME", "docs"),
      );
      const validPassword = equalSecret(
        separator >= 0 ? credentials.slice(separator + 1) : undefined,
        password,
      );
      if (validUser && validPassword) return next();
      res.setHeader(
        "WWW-Authenticate",
        'Basic realm="AgroCloud API documentation", charset="UTF-8"',
      );
      res.status(401).send("Autenticación requerida");
    },
  );

  const definition = new DocumentBuilder()
    .setTitle("AgroCloud · Billing API")
    .setVersion("0.1.0")
    .setDescription(
      [
        "API privada para órdenes, cobros verificados con Culqi y eventos hacia AgroCloud.",
        "## Flujo de integración",
        "1. Crear una orden con una referencia única y un importe en céntimos de PEN.",
        "2. Tokenizar mediante Culqi Checkout y solicitar el cargo desde el backend.",
        "3. Consultar el pago o conciliar antes de reintentar cualquier resultado UNKNOWN.",
        "4. Activar el servicio únicamente al recibir y validar el evento HMAC en Laravel.",
        "## Seguridad y estados",
        "Las rutas privadas requieren `x-service-key`. Nunca expongas esa clave en el navegador.",
        "`PROCESSING` y `UNKNOWN` bloquean nuevos cobros. `PAID` indica verificación del proveedor.",
        "Los reembolsos quedan pendientes de verificación; no revocan automáticamente suscripciones.",
        "Los eventos se entregan al menos una vez: el receptor debe deduplicar `event_id`.",
      ].join("\n\n"),
    )
    .addApiKey(
      {
        type: "apiKey",
        in: "header",
        name: "x-service-key",
        description: "Credencial privada del backend AgroCloud.",
      },
      "service-key",
    )
    .addTag(
      "Órdenes",
      "Registro idempotente y consulta de órdenes comerciales.",
    )
    .addTag("Pagos", "Cobros con token, consulta y conciliación con Culqi.")
    .addTag("Reembolsos", "Solicitud de devolución total y seguimiento local.")
    .addTag(
      "Culqi Webhooks",
      "Notificaciones verificadas consultando al proveedor.",
    )
    .addTag("Eventos internos", "Entrega firmada y reintentos hacia Laravel.")
    .addTag("Health", "Disponibilidad del proceso y de MongoDB.")
    .build();

  SwaggerModule.setup(
    "docs",
    app,
    SwaggerModule.createDocument(app, definition, {
      operationIdFactory: (controller, method) =>
        `${controller.replace("Controller", "")}_${method}`,
    }),
    {
      customSiteTitle: "AgroCloud | API Reference",
      customCss:
        ".swagger-ui .topbar { display: none } .swagger-ui .info { margin: 32px 0 }",
      jsonDocumentUrl: "/docs-json",
      raw: ["json"],
      swaggerOptions: {
        persistAuthorization: false,
        displayRequestDuration: true,
        filter: true,
        docExpansion: "none",
        tagsSorter: "alpha",
        operationsSorter: "alpha",
        defaultModelsExpandDepth: 1,
        supportedSubmitMethods:
          config.get<string>("NODE_ENV") === "production"
            ? []
            : ["get", "post"],
      },
    },
  );
}
