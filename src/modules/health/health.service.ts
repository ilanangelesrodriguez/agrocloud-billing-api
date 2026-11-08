import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  check() {
    return { status: 'ok', service: 'agrocloud-billing-api', version: '0.1.0' };
  }

  async ready() {
    try {
      if (this.connection.readyState !== 1 || !this.connection.db) throw new Error('Disconnected');
      await this.connection.db.admin().ping({ timeoutMS: 2000 });
      return { ...this.check(), dependencies: { mongodb: 'up' } };
    } catch {
      throw new ServiceUnavailableException('Base de datos no disponible');
    }
  }
}
