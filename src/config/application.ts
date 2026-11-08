import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { configureSwagger } from "./swagger.js";

export function configureApplication(app: NestExpressApplication): void {
  app.disable("x-powered-by");
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  configureSwagger(app);
}
