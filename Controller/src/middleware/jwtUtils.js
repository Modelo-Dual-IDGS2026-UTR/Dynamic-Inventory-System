import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
;
const accessSecret = process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;
const algorithm = 'HS256';
if (!accessSecret || !refreshSecret) {
    throw new Error("\n------FATAL ERROR: No jwt secret defined---------\n");
}
export const GenerateJWT = (payload, expiresIn = "15m") => {
    const options = {
        expiresIn,
        algorithm
    };
    return jwt.sign(payload, accessSecret, options);
};
export const generateRefreshToken = (payload) => {
    return jwt.sign(payload, refreshSecret, {
        algorithm,
        expiresIn: '7d',
        jwtid: randomUUID()
    });
};
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, refreshSecret, {
        algorithms: [algorithm]
    });
};
export const VerifyJWT = (requiredRole = 3) => {
    return (req, res, next) => {
        const token = req.cookies.jwtToken;
        const options = {
            algorithms: [algorithm]
        };
        if (!token) {
            return res.status(400).json({
                message: "no token received"
            });
        }
        try {
            const decoded = jwt.verify(token, accessSecret, options);
            const { role } = decoded;
            if (role > requiredRole) {
                return res.status(401).json({
                    messegae: "User Role Unauthorized"
                });
            }
            res.locals.jwtPayloadContent = decoded;
            next();
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                return res.status(401).json({
                    message: 'Access token expired'
                });
            }
            if (error instanceof jwt.JsonWebTokenError) {
                return res.status(401).json({
                    message: 'Invalid access token'
                });
            }
            return res.status(401).json({
                message: 'Authentication failed'
            });
        }
    };
};
//# sourceMappingURL=jwtUtils.js.map