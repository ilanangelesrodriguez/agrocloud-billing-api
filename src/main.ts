import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Request, Response, Express } from "express";
import { AppModule } from "./app.module.js";
import { configureApplication } from "./config/application.js";
import { ConfigService } from "@nestjs/config";

let serverPromise: Promise<Express> | undefined;

async function createApplication(): Promise<Express> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bodyParser: true,
  });

  configureApplication(app);

  if (process.env.VERCEL === "1") {
    // En Vercel no abrimos un puerto.
    await app.init();
  } else {
    // En local ejecutamos el servidor normalmente.
    app.enableShutdownHooks();
    await app.listen(
      app.get(ConfigService).getOrThrow<number>("PORT"),
      "0.0.0.0",
    );
  }

  return app.getHttpAdapter().getInstance() as Express;
}

// Punto de entrada HTTP para Vercel.
export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    serverPromise ??= createApplication().catch((error: unknown) => {
      serverPromise = undefined;
      throw error;
    });

    const server = await serverPromise;
    server(req, res);
  } catch (error) {
    console.error("Error al iniciar AgroCloud Billing API:", error);

    if (!res.headersSent) {
      res.status(500).json({
        statusCode: 500,
        message: "Error interno del servidor",
      });
    }
  }
}

// Inicio local.
if (process.env.VERCEL !== "1") {
  void createApplication().catch((error: unknown) => {
    console.error("Error al iniciar AgroCloud Billing API:", error);
    process.exitCode = 1;
  });
}
