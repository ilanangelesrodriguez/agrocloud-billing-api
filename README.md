<div align="center">

# 🌱 AgroCloud Billing API

**Servicio de cobros con Culqi para AgroCloud AI**

NestJS 12 · Node.js 22 · TypeScript 6 · MongoDB/Mongoose 9 · Vitest 4

</div>

## ¿Qué hace?

API privada de pagos: registra órdenes de la plataforma AgroCloud (Laravel/PostgreSQL), procesa cargos con **Culqi**, guarda intentos en **MongoDB**, verifica cargos contra Culqi y emite eventos HMAC para activar suscripciones o complementos en Laravel. El plan gratuito no utiliza esta API.

> **Estado: base funcional de integración (MVP de cargos con token de Culqi).** NO es una pasarela lista para operar con dinero real sin completar la integración de checkout de Laravel, probar 3DS, auditar seguridad y realizar pruebas de extremo a extremo en Culqi Sandbox. La renovación recurrente nativa, Yape/PagoEfectivo mediante órdenes Culqi y la conciliación automatizada completa quedan para siguientes versiones. No genera comprobantes SUNAT.

## Versiones

`package.json` conserva exactamente los **rangos de versión declarados** en `ilanangelesrodriguez/paycore-api` rama `main`, consultados el 7 de noviembre de 2026 (incluye NestJS `^12.0.1`, Mongoose `^9.11.4`, TypeScript `^6.0.2`, Vitest `^4.1.2`, Node `22.x`). Se respetan también las dependencias de desarrollo. Se incluye `package-lock.json`; usa `npm ci` para instalar las versiones resueltas.

## Arquitectura

```text
AgroCloud (Laravel + PostgreSQL)
  ├─ Solicitudes gratuitas y aprobación humana ─→ ACTIVACIÓN DIRECTA
  ├─ Planes, versiones, addons y suscripciones
  └─ Contratación pagada ──[API KEY]──→ AgroCloud Billing API
                                          │ NestJS + MongoDB
                                          ├─ payment_orders
                                          ├─ payment_attempts
                                          ├─ webhook_events
                                          ├─ outbound_events (reintentos)
                                          ├─ refunds
                                          └─ Culqi API v2
                                              ↕
                                        Culqi Checkout Custom
                                        (tokenización en Laravel)

Billing API ──[evento firmado HMAC]──→ Endpoint privado de Laravel
Laravel valida firma + referencia + estado y activa plan/complemento UNA VEZ.
```

## Arranque local

1. Instala Node **22** reciente, npm, MongoDB local o MongoDB Atlas.
2. Copia `.env.example` a `.env` (`cp .env.example .env`, o en PowerShell `Copy-Item .env.example .env`).
3. Define `MONGODB_URI`, dos secretos internos aleatorios de al menos 32 caracteres, un token de webhook aleatorio de 32 caracteres y llaves **test** de Culqi.
4. `npm install` (genera `package-lock.json`), `npm run start:dev`.
5. Abre `http://localhost:3000/docs` para Swagger o `GET /api/v1/health`.

No se permite producción con llaves test si `CULQI_MODE=live` ni usar `sk_live` con modo test. Solo el backend Laravel conoce `SERVICE_API_KEY`. El navegador **nunca** debe conocerla ni llamar a rutas privadas de órdenes/cargos.

### Comandos

```bash
npm install
npm run build
npm test
npm run start:dev
```

El proceso inicia con una conexión real a MongoDB; un Mongo no disponible hará fallar las operaciones y puede impedir el arranque. El `health` confirma que el servidor responde, pero no es una prueba de pago ni de conexión completa a todos los proveedores.

## Endpoints del MVP

| Método | Ruta | Autenticación | Uso |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | Pública | Liveness |
| POST | `/api/v1/orders` | `x-service-key` | Crear orden con referencia única |
| GET | `/api/v1/orders/:reference` | `x-service-key` | Consultar orden |
| POST | `/api/v1/payments/charges` | `x-service-key` | Cobrar token Culqi (solo servidor) |
| GET | `/api/v1/payments/:reference` | `x-service-key` | Consultar resultado |
| POST | `/api/v1/payments/:reference/reconcile` | `x-service-key` | Consultar proveedor por cargo existente |
| POST | `/api/v1/webhooks/culqi/:token` | Token de URL + verificación con Culqi | Notificación de cargo exitoso |
| POST | `/api/v1/internal/outbox/dispatch` | `x-service-key` | Reintentar eventos hacia Laravel |
| POST | `/api/v1/refunds` | `x-service-key` | Solicitar reembolso total; revisión posterior |
| GET | `/api/v1/refunds/:reference` | `x-service-key` | Estado local del reembolso |

**Importante:** un reembolso queda `PENDING_VERIFICATION`, no se marca como completado ni cancela automáticamente el acceso. Debes reconciliarlo contra Culqi, implementar confirmación de reembolso y decidir desde Laravel el efecto comercial antes de ponerlo en producción.

### Crear una orden

El plan, importe, periodo y addon son calculados y validados en Laravel. El navegador no puede cambiarlos.

```http
POST /api/v1/orders
x-service-key: TU_SECRETO_PRIVADO
Content-Type: application/json

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

Valores de `kind`: `PLAN`, `RENEWAL`, `USER_ADDON`, `AI_ADDON`, `LOT_ADDON`. La API no modifica `usuario` ni `suscripciones` directamente. El monto está expresado en **céntimos**.

### Cobrar con un token Culqi

El checkout **Culqi Custom** se integra en la UI de AgroCloud y genera `tkn_test_...`. Laravel recibe el token y, mediante comunicación privada, solicita el cobro:

```http
POST /api/v1/payments/charges
x-service-key: TU_SECRETO_PRIVADO
Content-Type: application/json

{
  "externalReference": "AGRO-ORDER-000125",
  "tokenId": "tkn_test_TOKEN_GENERADO_POR_CULQI"
}
```

La API obtiene el monto de la orden MongoDB (nunca del payload del cargo), llama a Culqi y verifica que el cargo devuelto por Culqi tenga igual importe, moneda, referencia y resultado exitoso.

- `PAID`: confirmado por Culqi; notificación a Laravel guardada para entrega.
- `PENDING`: aún sin iniciar o rechazo inequívoco; se puede reintentar con otro token.
- `PROCESSING`: un intento ya está en curso; se bloquean cobros paralelos.
- `UNKNOWN`: timeout / situación incierta; **NO reintentar el cargo** sin conciliación previa.

### Notificaciones Culqi

Registra en CulqiPanel la URL **HTTPS** `https://BILLING_HOST/api/v1/webhooks/culqi/TOKEN_ALEATORIO` con el evento de cargo exitoso. La API deduplica `event.id`, vuelve a consultar Culqi por el ID del cargo y comprueba que coincida con la orden. El token de URL no debe registrarse en logs ni compartirse. No se debe confiar en el JSON entrante para conceder acceso.

### Comunicación hacia AgroCloud

Configura `AGROCLOUD_EVENT_URL` con un endpoint Laravel (ejemplo `https://agrocloud.example.com/api/internal/billing/events`) y `AGROCLOUD_EVENT_SECRET` con el secreto compartido.

Payload de ejemplo:

```json
{
  "event_id": "payment.succeeded:AGRO-ORDER-000125",
  "type": "payment.succeeded",
  "order_reference": "AGRO-ORDER-000125",
  "company_id": 25,
  "amount_cents": 7900,
  "currency": "PEN",
  "kind": "PLAN",
  "provider_charge_id": "chr_test_..."
}
```

Se envía `X-AgroCloud-Signature: sha256=<HMAC-SHA256 del body exacto>`. Laravel debe comparar en tiempo constante el HMAC, validar la orden local (empresa, importe, versión comercial, estado), y activar la suscripción o complemento de forma **idempotente**. Responde 2xx solo si persistió correctamente el evento. Si Laravel falla, el evento permanece en `outbound_events` para reintentos. Consulta [`docs/INTEGRACION_LARAVEL.md`](docs/INTEGRACION_LARAVEL.md).

## ¿Dónde están los planes gratuitos?

**Solo en Laravel/PostgreSQL.** La prueba gratuita requiere aprobación del SUPERADMIN y su activación no genera una orden de cero céntimos en Billing API. Las ampliaciones y renovaciones pagadas sí crean órdenes. Una misma empresa conserva sus usuarios y datos al pasar del plan gratuito al pagado.

## Seguridad

- No almacenar PAN, CVV ni datos completos de tarjetas. Usar tokenización oficial desde el navegador.
- Mantener claves `sk_*`, `SERVICE_API_KEY` y `AGROCLOUD_EVENT_SECRET` exclusivamente en backend.
- Referencias únicas, protección ante reintentos y estados inciertos.
- Verificar pagos consultando a Culqi; no confiar en el webhook ni en la redirección visual.
- Revisar 3DS y flujos específicos de métodos de pago antes de habilitarlos en producción.
- Habilitar HTTPS, rate limiting en gateway, auditoría, alertas y rotación de claves.
- Revisar reglas fiscales y obligaciones de comprobantes electrónicos por separado.

## Limitaciones conocidas / próximos pasos

- Checkout visual se integra en AgroCloud Laravel; este repositorio **no incluye frontend ni modifica** su repositorio.
- Cobros con tarjeta/token como MVP. Yape, PagoEfectivo, generación de órdenes Culqi, 3DS y suscripciones recurrentes nativas aún no están integradas completamente.
- El módulo de reembolsos registra la solicitud; requiere flujo verificado de confirmación/conciliación antes de usar en vivo.
- No hay suscripción automática real ni cargos programados: las renovaciones se generan desde Laravel mediante orden `RENEWAL`.
- Los cambios de arquitectura y documentación requieren validación en integración antes de operar con dinero real.

## Referencias

- [Culqi API v2](https://apidocs.culqi.com/)
- [Culqi Custom Checkout](https://docs.culqi.com/es/documentacion/checkout/checkout-custom)
- [Culqi Webhooks](https://docs.culqi.com/es/documentacion/pagos-online/webhooks/)
- [AgroCloud](https://github.com/ilanangelesrodriguez/agrocloud)

## Documentación y operación en producción

Swagger UI está disponible en `/docs` y el contrato OpenAPI JSON en `/docs-json`, también con `NODE_ENV=production`. Ambos requieren HTTP Basic en producción:

```dotenv
NODE_ENV=production
SWAGGER_ENABLED=true
SWAGGER_USERNAME=docs
SWAGGER_PASSWORD=<secreto-independiente-de-al-menos-32-caracteres>
```

Sirve la API mediante HTTPS. No uses la clave de facturación como contraseña de documentación. El arranque valida la presencia de la contraseña en producción; `SWAGGER_ENABLED=false` deshabilita tanto UI como JSON. La UI no persiste credenciales de API y deshabilita la ejecución de solicitudes en producción. La autenticación de documentación no sustituye `x-service-key` para invocar la API.

La configuración HTTP y la documentación viven en `src/config/application.ts` y `src/config/swagger.ts`. Los contratos compartidos están en `src/common/docs/api-contract.ts`; los módulos conservan sus casos de uso y acceso a persistencia.

Los cobros guardan el evento de notificación sin esperar la respuesta HTTP de Laravel. En procesos persistentes el temporizador despacha eventos; en Vercel se debe programar externamente `POST /api/v1/internal/outbox/dispatch` con `x-service-key`. Cada llamada procesa hasta 20 eventos con cuatro entregas simultáneas y bloqueo de 60 segundos por evento entre instancias. Un proceso interrumpido libera la entrega al vencer el bloqueo. La entrega es al menos una vez; Laravel debe deduplicar por `event_id`. `attempted` cuenta candidatos del lote, que otra instancia podría haber reclamado.

El cambio de la orden a `PAID` y la inserción del evento son escrituras independientes. Si la segunda falla, vuelve a invocar conciliación del pago para regenerar idempotentemente el evento. Si un proceso termina dejando una orden `PROCESSING` sin identificador de cargo, revisa Culqi Panel antes de permitir cualquier nuevo cobro.

Para monitoreo usa `GET /api/v1/health` como liveness y `GET /api/v1/health/ready` como readiness de MongoDB. Readiness no comprueba pagos ni disponibilidad de Culqi. Los índices nuevos de outbox e intentos deben existir en MongoDB antes de recibir tráfico; si deshabilitas la creación automática de índices, aprovisiónalos durante el despliegue.
