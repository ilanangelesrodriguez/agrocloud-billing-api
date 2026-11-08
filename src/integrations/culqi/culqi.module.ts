import { Module } from '@nestjs/common';
import { CulqiService } from './culqi.service.js';

@Module({ providers: [CulqiService], exports: [CulqiService] })
export class CulqiModule {}
