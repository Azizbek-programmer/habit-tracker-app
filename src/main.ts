import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const port = process.env.PORT ?? 3000;
  const env = process.env.NODE_ENV ?? 'development';

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO’da yo‘q fieldlarni olib tashlaydi
      forbidNonWhitelisted: false, // ortiqcha field bo‘lsa error
      transform: true, // string -> number
    }),
  );

  // 📘 Swagger config (JWT qo‘shildi)
  const config = new DocumentBuilder()
    .setTitle('Users API')
    .setDescription('NestJS + Prisma Users CRUD + Auth')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token',
    )
    .build();

    app.use(cookieParser());


  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, () => {
    console.log(`📡 Server URL: http://localhost:${port}`);
    console.log(`📘 Swagger Docs: http://localhost:${port}/api/docs`);
  });
}

bootstrap();
