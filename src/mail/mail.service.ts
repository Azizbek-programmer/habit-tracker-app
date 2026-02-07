import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.smtp_host,
      port: Number(process.env.smtp_port),
      secure: false,
      auth: {
        user: process.env.smtp_user,
        pass: process.env.smtp_password,
      },
    });
  }

  async sendOtp(email: string, otp: string) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: 'Your OTP Code',
      html: `
        <h2>OTP Code</h2>
        <p>Your verification code:</p>
        <h1>${otp}</h1>
        <p>This code is valid for 5 minutes.</p>
      `,
    });
  }
}
