import { JwtPayload } from './payload.types';

export type JwtPayloadWithRefreshTokenAdmin = JwtPayload & { refreshToken: string };
