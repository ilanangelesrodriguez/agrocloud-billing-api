import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { equalSecret } from '../utils/secret.js';
import type { Request } from 'express';

@Injectable()
export class ServiceKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-service-key');
    if (!equalSecret(provided, this.config.getOrThrow<string>('SERVICE_API_KEY')))
      throw new UnauthorizedException('Credenciales de servicio inválidas');
    return true;
  }
}
