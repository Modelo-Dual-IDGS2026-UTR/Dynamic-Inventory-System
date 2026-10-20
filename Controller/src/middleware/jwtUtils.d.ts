import type { SignOptions } from 'jsonwebtoken';
import type { Response, Request, NextFunction } from 'express';
export interface jwtPayloadContent {
    userId: number;
    role: number;
}
export declare const GenerateJWT: (payload: jwtPayloadContent, expiresIn?: SignOptions["expiresIn"]) => string;
export declare const VerifyJWT: (requiredRole?: number) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=jwtUtils.d.ts.map