export const EMAIL_MESSAGES = {
  OTP: {
    uz: {
      subject: '🔐 Tasdiqlash kodingiz',
      greeting: 'Assalomu alaykum 👋',
      text1: 'Sizning tasdiqlash kodingiz (OTP) quyida keltirilgan:',
      expire: '⏰ Ushbu kod 5 daqiqa davomida amal qiladi.',
      ignore:
        'Agar bu so‘rovni siz yubormagan bo‘lsangiz, iltimos ushbu xabarni e’tiborsiz qoldiring.',
      title: 'Email tasdiqlash',
    },

    ru: {
      subject: '🔐 Ваш код подтверждения',
      greeting: 'Здравствуйте 👋',
      text1: 'Ваш код подтверждения (OTP):',
      expire: '⏰ Этот код действителен 5 минут.',
      ignore:
        'Если вы не запрашивали этот код, просто проигнорируйте это письмо.',
      title: 'Подтверждение Email',
    },

    en: {
      subject: '🔐 Your OTP Verification Code',
      greeting: 'Hello 👋',
      text1: 'Your verification code (OTP) is below:',
      expire: '⏰ This code is valid for 5 minutes.',
      ignore: 'If you did not request this code, please ignore this email.',
      title: 'Email Verification',
    },
  },
};
