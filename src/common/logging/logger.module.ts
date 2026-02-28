import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

const logDir = path.join(process.cwd(), 'logs');

// logs papkani avtomatik yaratish
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        // Console log
        new winston.transports.Console({
          format: winston.format.simple(),
        }),

        // Barcha loglar
        new winston.transports.File({
          filename: path.join(logDir, 'app.log'),
          level: 'info',
        }),

        // Faqat errorlar
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
        }),
      ],
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
})
export class LoggerModule {}
