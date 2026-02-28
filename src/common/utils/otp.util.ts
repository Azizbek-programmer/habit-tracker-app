import { randomInt } from 'crypto';

/**
 * Generate secure OTP string
 * @param length OTP uzunligi (default: 6)
 * @returns string
 */
export function generateOtp(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

  let otp = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = randomInt(0, chars.length);
    otp += chars[randomIndex];
  }

  return otp;
}
