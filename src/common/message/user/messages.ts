export const MESSAGES = {
  USER_CREATED: {
    uz: 'Foydalanuvchi muvaffaqiyatli yaratildi',
    ru: 'Пользователь успешно создан',
    en: 'User created successfully',
  },
  USER_EXISTS: {
    uz: 'Bu username yoki email bilan foydalanuvchi mavjud',
    ru: 'Пользователь с таким username или email уже существует',
    en: 'User with this username or email already exists',
  },
  BIRTH_FUTURE: {
    uz: 'Tug‘ilgan sana kelajakda bo‘lishi mumkin emas',
    ru: 'Дата рождения не может быть в будущем',
    en: 'Birth date cannot be in the future',
  },
  BIRTH_TOO_OLD: {
    uz: 'Tug‘ilgan sana juda eski',
    ru: 'Дата рождения слишком старая',
    en: 'Birth date is too old',
  },
  CREATE_FAILED: {
    uz: 'Foydalanuvchi yaratishda xatolik',
    ru: 'Ошибка при создании пользователя',
    en: 'Failed to create user',
  },
};

export const AUTH_MESSAGES = {
  USER_EXISTS: {
    uz: 'Bu username yoki email bilan foydalanuvchi allaqachon mavjud',
    ru: 'Пользователь с таким username или email уже существует',
    en: 'User with this username or email already exists',
  },

  PASSWORD_WEAK: {
    uz: 'Parol kamida 8 ta belgidan iborat kuchli password bo‘lishi kerak',
    ru: 'Пароль должен содержать минимум 8 символов',
    en: 'Password must be at least 8 characters long',
  },

  BIRTH_FUTURE: {
    uz: 'Tug‘ilgan sana kelajakda bo‘lishi mumkin emas',
    ru: 'Дата рождения не может быть в будущем',
    en: 'Birth date cannot be in the future',
  },

  BIRTH_TOO_OLD: {
    uz: 'Tug‘ilgan sana juda eski',
    ru: 'Дата рождения слишком старая',
    en: 'Birth date is too old',
  },

  REGISTER_SUCCESS: {
    uz: 'Ro‘yxatdan o‘tish muvaffaqiyatli. OTP emailingizga yuborildi',
    ru: 'Регистрация успешна. OTP отправлен на email',
    en: 'Registration successful. OTP sent to your email',
  },

  REGISTER_FAILED: {
    uz: 'Ro‘yxatdan o‘tishda xatolik yuz berdi',
    ru: 'Ошибка при регистрации',
    en: 'Registration failed',
  },
  BIRTH_INVALID: {
    uz: 'Tug‘ilgan sana noto‘g‘ri formatda yuborildi',
    ru: 'Неверный формат даты рождения',
    en: 'Invalid birth date format',
  },
  OTP_RESENT: {
    uz: 'Yangi OTP kod emailingizga qayta yuborildi',
    ru: 'Новый OTP код повторно отправлен на ваш email',
    en: 'A new OTP code has been resent to your email',
  },
};
