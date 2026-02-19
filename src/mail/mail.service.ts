import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;
  private readonly mailFrom: string;

  constructor(private readonly config: ConfigService) {
    this.mailFrom = this.config.getOrThrow<string>('MAIL_FROM');

    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('smtp_host'),
      port: Number(this.config.getOrThrow<number>('smtp_port')),
      secure: false,
      auth: {
        user: this.config.getOrThrow<string>('smtp_user'),
        pass: this.config.getOrThrow<string>('smtp_password'),
      },
    });
  }

  async sendOtp(email: string, otp: string) {
    await this.transporter.sendMail({
      from: `"My App" <${this.mailFrom}>`,
      to: email,
      subject: '🔐 Your OTP Verification Code',
      html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 30px;">
        <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden;">
          
          <div style="background: #4f46e5; color: #ffffff; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Email Verification</h1>
          </div>

          <div style="padding: 30px; color: #333;">
            <p style="font-size: 16px;">
              Assalomu alaykum 👋
            </p>

            <p style="font-size: 15px;">
              Sizning tasdiqlash kodingiz (OTP) quyida keltirilgan:
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <span style="
                display: inline-block;
                font-size: 32px;
                letter-spacing: 8px;
                background: #f3f4f6;
                padding: 15px 25px;
                border-radius: 8px;
                color: #111827;
                font-weight: bold;
              ">
                ${otp}
              </span>
            </div>

            <p style="font-size: 14px; color: #555;">
              ⏰ Ushbu kod <b>5 daqiqa</b> davomida amal qiladi.
            </p>

            <p style="font-size: 14px; color: #555;">
              Agar bu so‘rovni siz yubormagan bo‘lsangiz, iltimos ushbu xabarni e’tiborsiz qoldiring.
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

            <p style="font-size: 13px; color: #888; text-align: center;">
              © 2026 My App. All rights reserved.
            </p>
          </div>
        </div>
      </div>
      `,
    });
  }
}
