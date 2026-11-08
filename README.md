# AgroCloud Billing API

API privada de pagos para AgroCloud, desarrollada con NestJS, TypeScript y MongoDB. Registra órdenes, procesa cargos con Culqi y envía eventos firmados a Laravel.

## Inicio rápido

Requiere Node.js 22 y una instancia de MongoDB disponible.

```powershell
npm ci
Copy-Item .env.example .env
```

Configura en `.env` la conexión `MONGODB_URI`, las claves de Culqi y los secretos internos de al menos 32 caracteres. Usa claves `sk_test_` y `pk_test_` con `CULQI_MODE=test`, o claves `live` con `CULQI_MODE=live`.

```powershell
npm run start:dev
```

- Documentación Swagger: [localhost:3000/docs](http://localhost:3000/docs).
- Contrato OpenAPI: [localhost:3000/docs-json](http://localhost:3000/docs-json).
- Estado del proceso: `GET /api/v1/health`.
- Disponibilidad de MongoDB: `GET /api/v1/health/ready`.

`SWAGGER_ENABLED=false` deshabilita la documentación. Actualmente `/docs` y `/docs-json` son públicos; las operaciones privadas de la API requieren `x-service-key`.

## Cómo usar la API

Desde el backend Laravel, envía `x-service-key` con el valor de `SERVICE_API_KEY`.

1. Crea una orden mediante `POST /api/v1/orders`:

   ```json
   {
     "externalReference": "AGRO-ORDER-000125",
     "companyId": 25,
     "kind": "PLAN",
     "amountCents": 7900,
     "currency": "PEN",
     "customerEmail": "responsable@empresa.pe",
     "description": "Plan Profesional - 1 mes"
   }
   ```

2. Genera un token con Culqi Checkout y solicita el cargo mediante `POST /api/v1/payments/charges`:

   ```json
   {
     "externalReference": "AGRO-ORDER-000125",
     "tokenId": "tkn_test_TOKENCULQI"
   }
   ```

3. Consulta `GET /api/v1/payments/AGRO-ORDER-000125`. Si el resultado es `UNKNOWN`, concilia con `POST /api/v1/payments/AGRO-ORDER-000125/reconcile` antes de repetir el cobro.
4. Configura `AGROCLOUD_EVENT_URL` y `AGROCLOUD_EVENT_SECRET` para que Laravel reciba y valide el evento HMAC `payment.succeeded` y active el servicio una sola vez.

Los importes se expresan en céntimos de PEN. Mantén `SERVICE_API_KEY` y las claves secretas de Culqi exclusivamente en el backend. Los reembolsos quedan pendientes de verificación; no cancelan automáticamente suscripciones.

## Estructura

```text
src/
  bootstrap/        Configuración HTTP y Swagger
  common/           Autenticación, decoradores y utilidades compartidas
  config/           Validación de variables de entorno
  infrastructure/   Conexión a MongoDB y entrega de eventos outbox
  integrations/     Cliente de Culqi
  modules/          Órdenes, pagos, reembolsos, webhooks y salud
  app.module.ts     Composición de módulos
  main.ts           Entrada local y serverless
```

Los módulos mantienen controladores, servicios y módulos de NestJS juntos; los contratos de entrada viven en `dto/` y los modelos de MongoDB en `schemas/`. El formato utiliza dos espacios y comillas simples, configurados en `.editorconfig` y `.prettierrc.json`. Ejecuta `npm run format` para aplicarlo al código.

## Producción

Configura `NODE_ENV=production`, MongoDB, las claves de Culqi correspondientes al modo elegido y la URL HTTPS de Laravel. Para un servidor Node:

```sh
npm run build
npm run start:prod
```

En Vercel, programa llamadas autenticadas a `POST /api/v1/internal/outbox/dispatch`; los temporizadores de entrega solo se habilitan en procesos persistentes. Laravel debe deduplicar los eventos por `event_id`. Si un pago quedó confirmado sin notificación, su conciliación vuelve a generar el evento de forma idempotente.

Consulta el [contrato de integración con Laravel](docs/INTEGRACION_LARAVEL.md) para validar firmas y activar suscripciones. La integración de pagos reales requiere validación previa con Culqi; 3DS, recurrencia automática y confirmación de reembolsos siguen pendientes.
