import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('access-jwt') {
  getRequest(context: any) {
    const req = context.switchToHttp().getRequest();

    // Swagger'dan keladigan Authorization faqat token bo'lsa, Bearer qo'shamiz
    if (req.headers.authorization && !req.headers.authorization.startsWith('Bearer ')) {
      req.headers.authorization = `Bearer ${req.headers.authorization}`;
    }

    return req;
  }
}
