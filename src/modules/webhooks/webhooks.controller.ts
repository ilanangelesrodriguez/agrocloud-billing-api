import { ApiContract } from "../../common/docs/api-contract.js";

import { Body, Controller, Param, Post } from "@nestjs/common";

import { ApiBody, ApiParam, ApiTags } from "@nestjs/swagger";

import { WebhooksService } from "./webhooks.service.js";

@ApiTags("Culqi Webhooks")
@Controller("webhooks/culqi")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  // URL registrada en Culqi Panel: /api/v1/webhooks/culqi/<token aleatorio>

  // No se confía en el contenido del evento: SIEMPRE se consulta el cargo real al proveedor.

  @ApiParam({
    name: "token",
    description:
      "Token privado registrado en Culqi Panel. No registrar en logs.",
    schema: { type: "string", minLength: 32 },
  })
  @ApiBody({
    schema: {
      type: "object",
      required: ["id", "type", "data"],
      properties: {
        id: { type: "string", example: "evt_test_example" },

        type: { type: "string", example: "charge.creation.succeeded" },

        data: {
          oneOf: [
            { type: "object", additionalProperties: true },
            {
              type: "string",
              description: "Objeto del proveedor serializado como JSON.",
            },
          ],
        },
      },
    },
  })
  @ApiContract(
    "Recibir una notificación Culqi",
    "Deduplica por id y verifica el cargo consultando Culqi. accepted no significa pago confirmado. review requiere conciliación.",
    {
      type: "object",
      properties: {
        accepted: { type: "boolean" },
        duplicate: { type: "boolean" },
        ignored: { type: "boolean" },

        processed: { type: "boolean" },
        review: { type: "boolean" },
        reason: { type: "string" },
      },
    },
    201,
  )
  @Post(":token")
  receive(@Param("token") token: string, @Body() body: unknown) {
    return this.webhooks.process(token, body);
  }
}
