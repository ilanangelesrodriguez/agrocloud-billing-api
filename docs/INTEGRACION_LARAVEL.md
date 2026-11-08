# Integración con AgroCloud (Laravel + PostgreSQL)

## Contrato entre servicios

AgroCloud es la autoridad de planes, versiones, usuarios, suscripciones, complementos y cupos. Billing API tiene **MongoDB** y es la autoridad de órdenes, intentos y resultados de pago. Nunca conectar NestJS directamente a las tablas operativas de PostgreSQL.

### Alta de plan pagado

1. Laravel valida RUC/correo, plan y versión comercial y registra una contratación **pendiente**.
2. Laravel toma un snapshot del importe, moneda, empresa, referencia, tipo y período.
3. Laravel llama a Billing API `POST /api/v1/orders` desde el backend (con `x-service-key`).
4. Laravel muestra Culqi Custom Checkout con **clave pública** y el importe real. El cliente tokeniza la tarjeta sin exponer el número completo a Laravel ni a NestJS.
5. Laravel recibe el token Culqi, autentica la sesión/orden y solicita a Billing API `POST /api/v1/payments/charges`.
6. Billing API cobra, comprueba con Culqi y notifica `payment.succeeded` usando HMAC.
7. Laravel verifica **firma HMAC sobre body crudo**, referencia única, monto, moneda, tipo, empresa y que la orden siga pendiente. En una **transacción SQL**, registra el evento procesado y activa la suscripción. No debe activarla con solo el retorno del navegador.
8. Si es una empresa nueva, Laravel crea/habilita su cuenta administrativa e invita a establecer contraseña. Un error de correo no revierte el pago: permite reenvío seguro.

### Alta de prueba gratuita

Solicitar acceso → aprobación del SUPERADMIN → cuenta + suscripción de prueba → invitación → acceso. **No se usa Billing API**.

### Compra de usuario adicional

El administrador empresarial solicita +1 usuario → Laravel verifica que el complemento está permitido, guarda el importe y la referencia → Billing API cobra → Laravel confirma evento → aumenta el límite efectivo (base + addons) → ADMIN puede invitar usuario. La compra de cupo no crea automáticamente un trabajador.

### Renovaciones

Laravel prepara una orden `RENEWAL` por el importe total del siguiente período (plan base más addons recurrentes) y Billing API procesa el pago manual. La recurrencia automática de Culqi todavía no está implementada en este proyecto. Si se implementa después, debe resolverse la sincronización de precios y addons, las cancelaciones y las actualizaciones de estado del proveedor.

## Ejemplo de verificación de evento (pseudocódigo Laravel)

```php
$raw = $request->getContent();
$signature = (string) $request->header('X-AgroCloud-Signature');
$expected = 'sha256='.hash_hmac('sha256', $raw, config('services.billing.event_secret'));
abort_unless(hash_equals($expected, $signature), 401);

$data = $request->validate([
    'event_id' => ['required', 'string'],
    'type' => ['required', 'in:payment.succeeded'],
    'order_reference' => ['required', 'string'],
    'company_id' => ['required', 'integer'],
    'amount_cents' => ['required', 'integer'],
    'currency' => ['required', 'in:PEN'],
    'kind' => ['required', 'string'],
]);

DB::transaction(function () use ($data) {
    // Bloquea la orden local y comprueba todos los datos de la contratación.
    // Si event_id ya fue procesado => responder 200 sin repetir activación.
    // Guarda event_id con UNIQUE; actualiza la orden a CONFIRMADA.
    // Activa la suscripción o suma el complemento una única vez.
});
return response()->json(['received' => true]);
```

Este fragmento es conceptual y se debe adaptar a las tablas nuevas de suscripciones/órdenes de AgroCloud; no está instalado en el proyecto Laravel existente.

## Evitar cobros duplicados

- En Laravel usa una referencia única e inmutable por contratación o renovación.
- En MongoDB `payment_orders.externalReference` tiene índice único.
- Billing API solo permite un cargo al mismo tiempo por orden y bloquea reintentos ante `UNKNOWN`.
- No autorizar reintentos de cargo por HTTP timeout sin reconciliar con el proveedor; el proveedor puede haber cobrado.
- El `event_id` en PostgreSQL debe tener restricción `UNIQUE`.
- Devuelve 2xx solo después de completar la transacción SQL; Billing API reintenta entregas pendientes.

## Entrega de eventos

`POST /api/v1/internal/outbox/dispatch` permite reintentar desde un job seguro. En servidores de larga vida también hay reintentos automáticos; **en serverless no se garantiza que los timers sigan ejecutándose**, por lo que debes utilizar un cron/worker externo o polling programado. Los eventos `outbound_events` permanecen persistidos en MongoDB.

## Qué faltaría antes de producción

- Crear los módulos de catálogo de planes, suscripciones y complementos en AgroCloud Laravel.
- Integrar Custom Checkout/3DS y la gestión real del resultado de tokenización.
- Añadir conciliación operativa para operaciones `UNKNOWN` sin ID de cargo.
- Añadir verificación completa de reembolsos, alertas, monitoreo y límites de API.
- Probar idempotencia concurrente y los escenarios negativos con Culqi Sandbox.
