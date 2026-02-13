import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { JsonLoggingInterceptor } from './logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new JsonLoggingInterceptor('svc-gamma'));

  if (process.env.ENABLE_SWAGGER !== 'false') {
    const config = new DocumentBuilder().setTitle('svc-gamma').setVersion('1.0').build();
    const doc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, doc);
  }

  const port = Number(process.env.SVC_GAMMA_PORT ?? 3013);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
