declare namespace Express {
  interface Request {
    user?: {
      sub: string;
      email?: string;
      role?: string;
      jti?: string;
      refreshToken?: string;
    };
  }
}
