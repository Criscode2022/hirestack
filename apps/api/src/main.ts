import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { corsOriginDelegate } from './common/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: corsOriginDelegate,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('HireStack API')
    .setDescription('Two-sided hiring marketplace')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
