import { JwtPayload } from './admin.payload.types';

export type JwtPayloadWithRefreshTokenAdmin = JwtPayload & { refreshToken: string };
