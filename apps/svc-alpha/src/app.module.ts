import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ChaosStore } from './chaos.store';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [ChaosStore],
})
export class AppModule {}
