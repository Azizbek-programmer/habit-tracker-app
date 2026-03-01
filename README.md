<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
   <a href="https://www.typescriptlang.org/" target="_blank">
  <img src="https://raw.githubusercontent.com/remojansen/logo.ts/master/ts.svg" 
       width="120" 
       alt="TypeScript Logo" />
</a>
</p>

# <p align="center">🚀 Habits Tracker Backend</p>

  <p align="center">Shaxsiy rivojlanish va odatlarni kuzatish ilovasi uchun xavfsiz va aqlli backend.</p>

<div align="center">
<a href="https://www.prisma.io/" target="_blank">
  <img src="https://img.shields.io/badge/Prisma-Blue?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" />
</a>
<a href="https://www.postgresql.org/" target="_blank">
  <img src="https://img.shields.io/badge/PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</a>
<a href="https://redis.io/" target="_blank">
  <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis" />
</a>
<a href="https://nestjs.com/" target="_blank">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS" />
</a>
<a href="https://www.npmjs.com/package/bcrypt" target="_blank">
  <img src="https://img.shields.io/badge/bcrypt-9B59B6?style=flat-square&logo=npm&logoColor=white" alt="bcrypt" />
</a>
<a href="https://jwt.io/" target="_blank">
  <img src="https://img.shields.io/badge/JWT-000000?style=flat-square&logo=JSONWebTokens&logoColor=white" alt="JWT" />
</a>
<a href="https://nodemailer.com/about/" target="_blank">
  <img src="https://img.shields.io/badge/Nodemailer-D14836?style=flat-square&logo=nodemailer&logoColor=white" alt="Nodemailer" />
</a>
<a href="https://expressjs.com/" target="_blank">
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
</a>
<a href="https://www.typescriptlang.org/" target="_blank">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
</a>
<a href="https://nodejs.org/" target="_blank">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
</a>
</div>
</p>

<details>
  <summary style="font-size:16px; font-weight:600; color:#3b82f6;">📌 Loyihaning umumiy diogrammasi</summary>

  <div align="center ">
    <img src="./prisma/docs/diagram.svg" width="600" alt="Database Schema">
  </div>
</details>
<details>
<summary style="font-size:16px; font-weight:600; color:#3b82f6;">📡 API Overview</summary>
<div align="center">
 <details>

 <summary>🔐 Auth</summary>

### Auth Endpoints

<div align="left">

~~~js
POST /auth/register     // Foydalanuvchini ro‘yxatdan o‘tkazish (OTP yuboriladi)
POST /auth/verify-otp   // Emailga yuborilgan OTP kodni tasdiqlash
POST /auth/login        // Login qilish va access + refresh token olish
POST /auth/refresh      // Refresh token orqali yangi access token yaratish
POST /auth/logout       // Sessionni yopish va tokenlarni bekor qilish
~~~
</div>
</details>

<details>

<summary>👤 Users</summary>

### User Endpoints

<div align="left">

~~~js
POST   /users          // Yangi user yaratish
GET    /users          // Barcha userlarni olish (pagination bilan)
GET    /users/:id      // Userni ID orqali olish
PATCH  /users/:id      // User ma’lumotlarini yangilash
DELETE /users/:id      // Userni o‘chirish
~~~
</div>

</details>
</div>

</details>

<details>
<summary style="font-size:16px; font-weight:600; color:#3b82f6;">📘 Description</summary>
<div style="border-left: 3px solid #3b82f6; padding-left: 50px; margin-left: 6px;">
<h3>🧠 Backend haqida</h3>
Ushbu backend <b>NestJS</b>, <b>Prisma</b> va <b>TypeScript</b> asosida qurilgan bo‘lib,  
<b>tezkor</b>, <b>xavfsiz</b> va <b>oson kengaytiriladigan arxitektura</b>ga ega.
<h3>✨ Muhim jihatlar</h3>
<hr>
<ul>
<li>💾 <b>Ishonchli ma’lumotlar bazasi operatsiyalari</b><br>
Prisma tranzaksiyalari orqali ma’lumotlar yaxlitligi ta’minlanadi.</li>
<li>⚡ <b>Toza va kengaytiriladigan struktura</b><br>
Odatlar, maqsadlar va shaxsiy rivojlanish modullarini qo‘shish uchun tayyor arxitektura.</li>
</ul>
🚀 Ushbu backend <b>Habits Tracker</b> ilovasining yuragi bo‘lib,  
foydalanuvchilarga odatlarni kuzatish, rivojlanishni boshqarish va  
<b>xavfsiz tarzda o‘sishni</b> ta’minlaydi.
</div>
<br>
</details>



## Project setup

```bash
$ npm run start:dev #loyhani ishga tushirish
```

# <p align="center">🏗 Architecture Overview</p>
  <p align="center">Tizim servislar, ma’lumotlar bazasi va kesh qatlamlari o‘rtasida aniq ajratilgan mas’uliyat tamoyiliga asoslanadi.</p>

### 1️⃣ 🔐 Authentication & Authorization System
Kengaytirilgan xavfsizlik mexanizmlariga ega JWT asosidagi autentifikatsiya tizimi. 
OTP tasdiqlash, refresh token rotation, IP rate limiting va token reuse detection orqali himoyalangan.

<details>
<summary style="font-size:18px; font-weight:700; color:#22c55e;">📝 Auth → Register (Advanced Secure Flow)</summary>

<br>

---

#  Register tizimi haqida

Ushbu `register` oddiy foydalanuvchi yaratish funksiyasi emas.  
Bu production-ready, xavfsiz va professional darajadagi **multi-layer validation + OTP verification** tizimidir.

Oddiy register’dan farqli ravishda bu yerda:

- ❌ Oddiy ma’lumot saqlash yo‘q  
- 🔐 Kuchli xavfsizlik tekshiruvlari mavjud  
- 📧 Email tasdiqlash majburiy  
- 🔄 Pending user uchun OTP resend mexanizmi bor  
- 🧠 Ma’lumotlar tranzaksiya orqali saqlanadi  

---

# 🧩 Register Flow Bosqichlari

---

## 1️⃣ 🎂 Birth Date Validation (Kengaytirilgan tekshiruv)

- 📌 Faqat valid timestamp qabul qilinadi
- ❌ Noto‘g‘ri format rad etiladi
- ❌ Kelajak sanasi mumkin emas
- ❌ 1900-yildan eski sana mumkin emas
- 🌍 Xatolik xabarlari `locale` asosida qaytariladi

👉 Bu noto‘g‘ri yoki manipulyatsiya qilingan ma’lumotlarni oldini oladi.

---

## 2️⃣ 🔑 Strong Password Validation

Password oddiy emas. Quyidagilar majburiy:

- 🔡 Kamida 1 ta kichik harf
- 🔠 Kamida 1 ta katta harf
- 🔢 Kamida 1 ta raqam
- 🔐 Kamida 1 ta maxsus belgi
- 📏 Minimum 8 ta belgi

Weak password → darhol `400 BadRequest`

---

## 3️⃣ 👤 User Exists Smart Check

Email yoki username bazada tekshiriladi.

### Holatlar:

### ✅ ACTIVE user bo‘lsa:
- ❌ Register to‘xtatiladi
- `409 Conflict`

### 🕒 PENDING user bo‘lsa:
- 🔄 Yangi OTP yaratiladi
- 🔐 OTP hash qilinadi
- 💾 userSession ga yoziladi
- 📧 Email qayta yuboriladi
- 🔁 Yangi user yaratmaydi

👉 Bu duplicate account ochilishini oldini oladi.

---

## 4️⃣ 🔐 Password Hashing

- `bcrypt` bilan hash qilinadi
- Plain password hech qachon saqlanmaydi

---

## 5️⃣ 🔢 OTP Generation & Hash

- 6 xonali OTP generatsiya qilinadi
- 5 daqiqa amal qiladi
- OTP ham `bcrypt` orqali hash qilinadi
- Plain OTP bazada saqlanmaydi

---

## 6️⃣ 🧼 Email Normalization

- Email `toLowerCase()`
- `trim()` qilinadi

👉 Duplicate email risk kamayadi.

---

## 7️⃣ 🏗 Prisma Transaction

Quyidagilar **bitta transaction** ichida bajariladi:

- 👤 User yaratish
- 🔐 OTP bilan userSession yaratish

Agar bittasi xato bersa — hammasi rollback bo‘ladi.

---

## 8️⃣ 📧 OTP Email Yuborish

- Transaction tugagandan keyin yuboriladi
- Database consistency saqlanadi

---

## 9️⃣ 🌍 Localized Response System

Barcha xatolik va success xabarlari:

- 🇺🇿 Uzbek
- 🇷🇺 Russian
- 🇬🇧 English

`dto.locale` asosida ishlaydi.

---

# 🛡 Security Advantages

Bu register tizimi:

- 🔒 Hashlangan password
- 🔐 Hashlangan OTP
- 🔁 OTP resend protection
- 🧠 Smart status handling (ACTIVE / PENDING)
- 💾 Transactional safety
- 🌍 Localized errors
- ❌ Duplicate protection
- 📅 Strict data validation

---

# ⚡ Oddiy Register’dan Farqi

| Oddiy Register | Sizning Register |
|---------------|------------------|
| Faqat user create | Multi-layer validation |
| OTP yo‘q | OTP verification system |
| Transaction yo‘q | Prisma transaction |
| Password minimal check | Strong regex validation |
| Duplicate muammo | Smart status logic |
| Email normalize qilinmaydi | Normalize qilinadi |
| Plain OTP | Hashed OTP |

---

# 🧠 Xulosa

Bu `register` production darajadagi,  
enterprise xavfsizlik standartlariga yaqinlashtirilgan tizim bo‘lib:

> 🔥 Account abuse oldini oladi  
> 🔥 Duplicate user yaratmaydi  
> 🔥 Ma’lumotlar yaxlitligini saqlaydi  
> 🔥 OTP orqali haqiqiy email egasini tasdiqlaydi  

Bu oddiy CRUD emas — bu real security flow.

<br>
</details>

<details>
<summary style="font-size:18px; font-weight:700; color:#3b82f6;">📩  Auth → Verify OTP (Secure Verification Flow)</summary>

<br>

---

# 🚀 Verify OTP tizimi haqida

`verifyOtp` oddiy kod tekshirish funksiyasi emas.  
Bu foydalanuvchini **real email egasi ekanligini tasdiqlovchi xavfsiz verifikatsiya bosqichi** hisoblanadi.

Register jarayonidan keyingi eng muhim security layer aynan shu yerda ishlaydi.

Oddiy OTP tekshiruvdan farqli ravishda bu yerda:

- 🔐 Hashlangan OTP bilan solishtirish
- ⏳ OTP expiration nazorati
- 🧠 User status boshqaruvi
- 🗑 OTP ni bir martalik qilish (reuse yo‘q)
- 💥 Kuchli error handling (try/catch + aniq exceptionlar)

---

# 🧩 Verify OTP Flow Bosqichlari

---

## 1️⃣ 🔎 Session & OTP Topish

- UserSession orqali OTP olinadi
- Faqat aktiv va muddati tugamagan OTP tekshiriladi
- Not found → darhol `400 BadRequest`

👉 Bu noto‘g‘ri yoki tasodifiy urinishlarni kesadi.

---

## 2️⃣ ⏳ OTP Expiration Tekshiruvi

- OTP 5 daqiqa amal qiladi
- Muddati o‘tgan bo‘lsa → rad etiladi
- Security jihatdan brute-force hujumlarni kamaytiradi

---

## 3️⃣ 🔐 Hashed OTP Compare

- Kiritilgan OTP plain text
- Bazadagi OTP esa hash
- `bcrypt.compare()` orqali tekshiriladi

👉 Plain OTP hech qachon bazada saqlanmaydi.

---

## 4️⃣ 🔄 One-Time Usage Protection

OTP muvaffaqiyatli tasdiqlangandan keyin:

- 🗑 OTP code o‘chiriladi yoki null qilinadi
- ⛔ Qayta ishlatish imkonsiz bo‘ladi

Bu replay attack’ni oldini oladi.

---

## 5️⃣ 👤 User Status Update

Tasdiqlangandan keyin:

- User `PENDING` → `ACTIVE`
- Account to‘liq aktivlashadi

👉 Email tasdiqlanmaguncha login mumkin emas.

---

## 6️⃣ 🧠 Kuchli Validation Qatlami

- OTP format tekshiruvi
- User mavjudligini tekshirish
- Session mavjudligini tekshirish
- Noto‘g‘ri urinishlarga aniq javoblar

Bu noto‘g‘ri input’larni boshidayoq to‘xtatadi.

---

## 7️⃣ 💥 Professional Error Handling

Kod ichida:

- `BadRequestException`
- `UnauthorizedException`
- `ConflictException`
- Global `try/catch`

Unexpected xatolar → `500 InternalServerError`

👉 System ichki xatolarini tashqariga chiqarmaydi.

---

# 🛡 Security Advantages

Verify OTP tizimi:

- 🔒 Hashlangan OTP
- ⏳ Expiration nazorati
- 🔁 One-time usage
- 🧠 Status based activation
- 💥 Toza exception handling
- 🚫 Brute-force risk kamaytirilgan
- 📦 Database consistency saqlangan

---

# ⚡ Oddiy OTP Verification’dan Farqi

| Oddiy OTP | Sizning Verify OTP |
|-----------|-------------------|
| Plain OTP | Hashed OTP |
| Expire nazorati yo‘q | 5 daqiqalik limit |
| Qayta ishlatish mumkin | One-time usage |
| Status update yo‘q | PENDING → ACTIVE |
| Minimal error handling | Structured exceptions |
| Oddiy tekshiruv | Multi-layer validation |

---

# 🧠 Xulosa

Bu `verifyOtp` oddiy kod solishtirish emas —  
bu account aktivatsiya xavfsizlik devoridir.

> 🔥 Soxta accountlarni filtrlaydi  
> 🔥 Email egasini real tasdiqlaydi  
> 🔥 Replay attack’ni bloklaydi  
> 🔥 Account lifecycle’ni to‘liq boshqaradi  

Bu register’dan keyingi eng muhim security checkpoint hisoblanadi.

<br>
</details>


<details>
<summary style="font-size:18px; font-weight:700; color:#f97316;">🔑  Auth → Login (Enterprise Secure Login Flow)</summary>

<br>

---

# 🚀 Login tizimi haqida

Bu `login` oddiy email + password tekshiruvchi endpoint emas.  
Bu ko‘p qatlamli himoya tizimiga ega bo‘lgan, brute-force va credential attack’lardan himoyalangan professional autentifikatsiya mexanizmi.

Oddiy login’dan farqli ravishda bu yerda:

- 🌍 IP asosida global rate limit
- 🚫 IP vaqtinchalik bloklash
- 🔐 Account-level lock system (exponential backoff)
- 🧠 Failed attempt tracking
- 🔄 Refresh token family system
- 🍪 Secure HTTP-only cookie
- 📦 Redis + Database hybrid security

---

# 🧩 Login Flow Bosqichlari

---

## 1️⃣ 🌍 IP Detection & Tracking

- `x-forwarded-for` orqali real IP olinadi
- Fallback: `req.socket.remoteAddress`
- Har bir IP uchun alohida monitoring mavjud

👉 Reverse proxy va production muhit uchun moslashtirilgan.

---

## 2️⃣ 🚫 IP Block Check

Agar IP vaqtinchalik bloklangan bo‘lsa:

- Login darhol rad etiladi
- Hech qanday qo‘shimcha ma’lumot berilmaydi

👉 Attack surface kamayadi.

---

## 3️⃣ ⚡ Global Rate Limit (Redis)

- 20 ta request / 60 sekund
- Limitdan oshsa → 5 minut IP block

Redis orqali:
```js
rate:login:ip:{ip}
block:login:ip:{ip}
```


👉 Distributed system uchun ham mos.

---

## 4️⃣ 👤 User Lookup (Minimal Select)

Bazadan faqat kerakli fieldlar olinadi:

- id
- email
- password (hash)
- role
- status
- failedLoginAttempts
- lockUntil

👉 Performance optimizatsiya qilingan.

---

## 5️⃣ 🔒 Account Lock System (Exponential Backoff)

Noto‘g‘ri password bo‘lsa:

| Attempt | Lock Time |
|---------|-----------|
| 5 | 10 min |
| 6 | 30 min |
| 7 | 2 soat |
| 8+ | 24 soat |

Bu exponential security strategy hisoblanadi.

👉 Bruteforce hujumlarni real bloklaydi.

---

## 6️⃣ 🔁 Failed Attempts Tracking

- `failedLoginAttempts` database’da saqlanadi
- IP bo‘yicha ham alohida fail count mavjud
- 10 ta IP xato urinish → 10 minut block

👉 Account + IP double protection mavjud.

---

## 7️⃣ 🔐 Password Validation

- `bcrypt.compare()` ishlatiladi
- Plain password hech qachon saqlanmaydi
- User bor yoki yo‘qligidan qat’i nazar bir xil error qaytadi

👉 Username enumeration attack oldi olinadi.

---

## 8️⃣ 🧼 Successful Login Cleanup

Agar login muvaffaqiyatli bo‘lsa:

- failedLoginAttempts reset qilinadi
- lockUntil null qilinadi
- IP fail counter o‘chiriladi

👉 Account normal holatga qaytadi.

---

## 9️⃣ 🧠 Status Based Access Control

Password to‘g‘ri bo‘lsa ham:

- `PENDING` → Email verify required
- `SUSPENDED` → Account suspended
- `BANNED` → Account banned

👉 Status-based security enforcement.

---

## 🔟 🎟 Access & Refresh Token Generation

- Access token (short-lived)
- Refresh token (long-lived)
- Har login uchun:
- `jti` (unique token id)
- `familyId` (refresh rotation uchun)

JWT ichida:
- sub
- email
- role
- jti
- familyId


👉 Token reuse detection uchun tayyor arxitektura.

---

## 1️⃣1️⃣ 🔐 Refresh Token Hashing

- Refresh token ham `bcrypt` bilan hash qilinadi
- Plain refresh token bazada saqlanmaydi

👉 Agar DB leak bo‘lsa ham token ishlatilmaydi.

---

## 1️⃣2️⃣ 📦 Session Creation (Database)

Har login uchun yangi session:

- userId
- refreshFamilyId
- hashedRefreshToken
- ipAddress
- deviceInfo
- userAgent
- lastLoginAt

👉 Multi-device support mavjud.

---

## 1️⃣3️⃣ 🧠 Redis JTI Store

Refresh token JTI Redis’da saqlanadi:
```js
refresh:jti:session:{sessionId}
```


TTL asosida expire bo‘ladi.

👉 Token reuse detection uchun foundation.

---

## 1️⃣4️⃣ 🍪 Secure Cookie Strategy

Refresh token:

- httpOnly
- sameSite: strict
- secure (production’da)
- maxAge config’dan olinadi

👉 XSS orqali o‘g‘irlash qiyinlashadi.

---

# 🛡 Security Advantages

Bu login tizimi:

- 🌍 IP rate limiting
- 🚫 Temporary IP block
- 🔒 Exponential account lock
- 🔁 Failed attempt tracking
- 🔐 Hashed refresh token
- 🧠 Status validation layer
- 📦 Redis + DB hybrid protection
- 🍪 Secure HTTP-only cookie
- 🎟 Token family architecture
- 🚫 Enumeration protection

---

# ⚡ Oddiy Login’dan Farqi

| Oddiy Login | Sizning Login |
|-------------|---------------|
| Faqat password check | Multi-layer security |
| Rate limit yo‘q | Redis rate limiting |
| Lock yo‘q | Exponential lock system |
| Token oddiy | JTI + Family ID |
| Refresh plain | Hashed refresh token |
| Cookie oddiy | Secure HTTP-only |
| IP monitoring yo‘q | IP tracking & blocking |

---

# 🧠 Xulosa

Bu `login` endpoint oddiy authentication emas —  
bu real production darajadagi **security gateway**.

> 🔥 Brute-force attack’ni bloklaydi  
> 🔥 Account abuse’ni kamaytiradi  
> 🔥 Token reuse’ga tayyor  
> 🔥 Multi-device session boshqaradi  
> 🔥 Enterprise-level himoya qatlamlariga ega  

Bu tizim security-first arxitektura asosida qurilgan.

<br>
</details>


<details>
<summary style="font-size:18px; font-weight:700; color:#6366f1;">🔁 Auth → Refresh Token (Rotation + Reuse Detection Flow)</summary>

<br>

---

# 🚀 Refresh Token tizimi haqida

Bu `refreshTokens` endpoint oddiy access token yangilash funksiyasi emas.  
Bu **enterprise darajadagi token rotation va reuse detection mexanizmi** hisoblanadi.

Oddiy refresh flow’dan farqli ravishda bu yerda:

- 🔐 Refresh token integrity check
- 🧠 Session-based verification
- 🔁 JTI rotation
- 👨‍👩‍👧 Token family architecture
- 🚫 Token reuse detection
- 🔒 Redis concurrency lock
- 💾 Transactional rotation
- 🍪 Secure cookie update

Bu endpoint butun auth tizimining eng nozik xavfsizlik qismi hisoblanadi.

---

# 🧩 Refresh Flow Bosqichlari

---

## 1️⃣ 🔐 JWT Verification

- `verifyAsync()` orqali token tekshiriladi
- Expired yoki noto‘g‘ri token → darhol `Unauthorized`
- `ignoreExpiration: false`

👉 Soxta yoki o‘zgartirilgan tokenlar kesiladi.

---

## 2️⃣ 📦 Payload Validation

Quyidagilar majburiy:

- `sub` (userId)
- `jti`
- `familyId`

Bittasi yo‘q bo‘lsa → Access denied

👉 Token structure integrity himoyasi.

---

## 3️⃣ 🗄 Session Lookup (Database)

Session topiladi:

- userId
- refreshFamilyId

Topilmasa:

- Fake hash compare bajariladi
- `Unauthorized`

👉 Timing attack oldini olish uchun fake compare ishlatilgan.

---

## 4️⃣ 🔐 Refresh Token Integrity Check

- `bcrypt.compare()` orqali tekshiriladi
- Plain refresh token hech qachon bazada saqlanmaydi

👉 Database leak bo‘lsa ham token ishlamaydi.

---

## 5️⃣ 🔒 Redis-based Concurrency Lock

Bir vaqtning o‘zida bir nechta refresh urinishni bloklash:
```js
lock:refresh:session:{sessionId}
```

- 10 sekundlik lock
- NX flag bilan atomik set

👉 Parallel refresh attack oldini oladi.

---

## 6️⃣ 🚫 Reuse Detection (JTI Check)

Redis’da saqlangan JTI tekshiriladi:
```js
refresh:jti:session:{sessionId}
```

Agar:

- Redis JTI yo‘q
- Yoki JTI mos kelmasa

👉 Bu token reuse hisoblanadi

Natija:

- Session delete qilinadi
- Cookie tozalanadi
- Unauthorized (token reuse)

Bu real security breach signal hisoblanadi.

---

## 7️⃣ 🔄 Token Rotation

Har refresh’da:

- 🔁 Yangi `jti`
- 🔁 Yangi Access Token
- 🔁 Yangi Refresh Token
- 🔐 Yangi hashed refresh token

Family ID o‘zgarmaydi (token family continuity).

👉 True rotation mexanizmi.

---

## 8️⃣ 🧠 Transactional Update

Database + Redis update bitta transaction ichida:

- Session update
- Redis JTI set (TTL bilan)

Agar xatolik bo‘lsa:

- Session revoke qilinadi
- InternalServerError

👉 Consistency saqlanadi.

---

## 9️⃣ 🍪 Secure Cookie Update

Yangi refresh token:

- httpOnly
- sameSite: strict
- secure (production’da)
- maxAge config asosida

👉 XSS orqali o‘g‘irlash qiyinlashadi.

---

## 🔟 🔓 Lock Release (finally block)

Redis lock har doim finally ichida o‘chiriladi.

👉 Deadlock holatlari oldi olinadi.

---

# 🛡 Security Advantages

Bu refresh tizimi:

- 🔐 Hashed refresh token
- 🔁 True rotation system
- 🚫 Reuse detection
- 🔒 Redis concurrency lock
- 🧠 Token family architecture
- 📦 Transactional integrity
- ⏳ TTL-based JTI storage
- 💥 Timing attack protection
- 🍪 Secure cookie handling

---

# ⚡ Oddiy Refresh’dan Farqi

| Oddiy Refresh | Sizning Refresh |
|---------------|----------------|
| Faqat verify | Multi-layer validation |
| Rotation yo‘q | JTI rotation |
| Reuse detection yo‘q | Redis-based detection |
| Lock yo‘q | Concurrency lock |
| Plain token saqlash | Hashed refresh |
| Session nazorati yo‘q | Session-bound refresh |
| Transaction yo‘q | DB + Redis atomic update |

---

# 🧠 Xulosa

Bu `refreshTokens` endpoint oddiy token yangilash emas —  
bu to‘liq **zero-trust rotation architecture** hisoblanadi.

> 🔥 Token o‘g‘irlangan bo‘lsa aniqlaydi  
> 🔥 Reuse holatida session’ni bekor qiladi  
> 🔥 Parallel refresh’ni bloklaydi  
> 🔥 Database leak’dan himoya qiladi  
> 🔥 Production-ready security qatlamiga ega  

Bu tizim haqiqiy enterprise auth darajasiga yaqinlashtirilgan.

<br>
</details>

<details>
<summary style="font-size:18px; font-weight:700; color:#ef4444;">
🚪 Auth → Logout (Secure Session Termination Flow)
</summary>

<br>

---

# 🚀 Logout tizimi haqida

Bu `logout` oddiygina “tokenni o‘chirish” emas.

Bu yerda:

- 🔐 Refresh token verification
- 👤 Token owner validation
- 🧬 Refresh token family check
- 📦 Session database’dan o‘chirish
- 🧠 Redis JTI tozalash
- 🚫 Access token blacklist
- 🛡 Multi-device xavfsiz session yopish

Bu professional darajadagi **secure session invalidation system** hisoblanadi.

---

# 🧩 Logout Flow Bosqichlari

---

## 1️⃣ 🔍 Refresh Token Mavjudligini Tekshirish

Agar refresh token yuborilmasa:

```ts
if (!refreshToken) {
  throw new UnauthorizedException('Refresh token missing');
}
```

👉 Bu minimal validation emas — bu noto‘g‘ri client request’ni darhol rad etish.

---

## 2️⃣ 🔐 Token Verification (try/catch bilan)

```ts
try {
  payload = await this.jwtService.verifyAsync(refreshToken, {
    secret: this.config.getOrThrow<string>('REFRESH_TOKEN_KEY'),
  });
} catch {
  throw new UnauthorizedException('Invalid or expired refresh token');
}
```

Bu yerda:

- Token signature tekshiriladi
- Expire bo‘lgan token aniqlanadi
- Soxtalashtirilgan token rad etiladi

👉 Server crash bo‘lmaydi  
👉 Foydalanuvchiga minimal ma’lumot beriladi  
👉 Security leakage oldi olinadi  

---

## 3️⃣ 👤 Token Owner Validation

```ts
if (payload.sub !== userId) {
  throw new UnauthorizedException('Invalid token owner');
}
```

Bu qadam:

- Token boshqa userga tegishli emasligini tekshiradi
- Session hijack attack’ni bloklaydi

👉 Token borligi yetarli emas — egasi ham to‘g‘ri bo‘lishi shart.

---

## 4️⃣ 🧬 Refresh Token Family Validation

```ts
const familyId = payload.familyId;

if (!familyId) {
  throw new UnauthorizedException('Invalid refresh token');
}
```

Agar `familyId` bo‘lmasa:

- Token noto‘g‘ri
- Rotation tizimi buzilgan

👉 Bu refresh rotation arxitekturasining bir qismi.

---

## 5️⃣ 📦 Session Lookup (Database)

```ts
const session = await this.prisma.userSession.findFirst({
  where: {
    userId,
    refreshFamilyId: familyId,
  },
});
```

Bu qadam:

- Multi-device sessionlarni qo‘llab-quvvatlaydi
- Aynan shu refresh family’ga tegishli session topiladi

👉 Har logout barcha sessionlarni emas — faqat tegishlisini yopadi.

---

## 6️⃣ 🧠 Redis JTI Tozalash

```ts
await redis.del(`refresh:jti:session:${session.id}`);
```

Bu:

- Refresh token reuse detection tizimidan o‘chiriladi
- Eski token qayta ishlatilmasligi uchun asos yaratadi

👉 Distributed environment uchun muhim.

---

## 7️⃣ 🗑 Session Database’dan O‘chirish

```ts
await this.prisma.userSession.delete({
  where: { id: session.id },
});
```

Bu:

- Device-level logout
- Session invalidation
- Audit log tizimi uchun toza arxitektura

👉 Real production’ga mos session management.

---

## 8️⃣ 🚫 Access Token Blacklist

```ts
if (payload.jti) {
  const ttlSec = this.config.getOrThrow<number>('ACCESS_TOKEN_TTL_SEC');

  await redis.set(
    `blacklist:access:${payload.jti}`,
    'revoked',
    'EX',
    ttlSec,
  );
}
```

Bu juda muhim qadam.

Access token:

- Normalda stateless bo‘ladi
- Logout qilinganda darhol invalid bo‘lishi kerak

Shuning uchun:

- `jti` Redis blacklist’ga qo‘shiladi
- TTL access token muddati bilan teng

👉 Access token darhol ishlamay qoladi.

---

# 🛡 Security Advantages

Bu logout tizimi:

- 🔐 JWT signature verification
- 👤 Token owner validation
- 🧬 Family-based rotation control
- 📦 Database session invalidation
- 🧠 Redis JTI cleanup
- 🚫 Access token blacklist
- 🛡 Multi-device granular logout
- ⚙ try/catch asosidagi safe error handling

---

# ⚡ Oddiy Logout’dan Farqi

| Oddiy Logout | Sizning Logout |
|--------------|---------------|
| Client tokenni o‘chiradi | Server-side session invalidation |
| JWT baribir ishlayveradi | Access token blacklist qilinadi |
| Session nazorati yo‘q | DB-based session control |
| Rotation yo‘q | Family-based system |
| Redis yo‘q | Hybrid Redis + DB |

---

# 🧠 Arxitektura Kuchli Tomonlari

Bu logout:

- Stateless JWT muammosini hal qiladi
- Token reuse attack’ni kamaytiradi
- Session hijack’ni bloklaydi
- Distributed system uchun tayyor
- Enterprise security tamoyillariga mos

---

# 🎯 Xulosa

Bu `logout` oddiy endpoint emas.

Bu:

🔥 Session invalidation gateway  
🔥 Token lifecycle control  
🔥 Refresh rotation security layer  
🔥 Real production-ready logout mechanism  

Security-first yondashuv asosida yozilgan professional darajadagi tizim.

<br>
</details>


















<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
