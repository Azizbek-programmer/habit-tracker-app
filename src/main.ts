import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const logger = new Logger('Bootstrap');

  const port = process.env.PORT ?? 3000;  

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.use(cookieParser());

  app.useGlobalFilters(
    new AllExceptionsFilter(app.get(WINSTON_MODULE_NEST_PROVIDER)),
  );

  const config = new DocumentBuilder()
    .setTitle('Users API')
    .setDescription('JWT + OTP + Redis + Prisma + NestJS')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);

  console.log(`📡 Server URL: http://localhost:${port}`);
  console.log(`📘 Swagger Docs: http://localhost:${port}/api/docs`);
}

bootstrap();