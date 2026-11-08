import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboundEvent, OutboundEventSchema } from './schemas/outbox.schema.js';
import { OutboxController } from './outbox.controller.js';
import { OutboxService } from './outbox.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: OutboundEvent.name, schema: OutboundEventSchema }])],
  providers: [OutboxService],
  controllers: [OutboxController],
  exports: [OutboxService],
})
export class OutboxModule {}
