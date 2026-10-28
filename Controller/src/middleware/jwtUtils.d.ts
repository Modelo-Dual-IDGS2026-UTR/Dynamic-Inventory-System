import type { SignOptions } from 'jsonwebtoken';
import type { Response, Request, NextFunction } from 'express';
export interface JwtPayloadContent {
    userId: number;
    role: number;
}
export interface RefreshTokenPayload {
    userId: number;
    sessionId: string;
}
export declare const GenerateJWT: (payload: JwtPayloadContent, expiresIn?: SignOptions["expiresIn"]) => string;
export declare const generateRefreshToken: (payload: RefreshTokenPayload) => string;
export declare const verifyRefreshToken: (token: string) => RefreshTokenPayload;
export declare const VerifyJWT: (requiredRole?: number) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=jwtUtils.d.ts.map