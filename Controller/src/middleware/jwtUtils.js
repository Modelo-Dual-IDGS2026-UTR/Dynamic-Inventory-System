import jwt from 'jsonwebtoken';
;
const JWT_Secret = process.env.JWT_SECRET;
const algorithm = 'HS256';
if (!JWT_Secret) {
    throw new Error("\n------FATAL ERROR: No jwt secret defined---------\n");
}
export const GenerateJWT = (payload, expiresIn = 15000) => {
    const options = {
        expiresIn,
        algorithm
    };
    return jwt.sign(payload, JWT_Secret, options);
};
export const VerifyJWT = (requiredRole = 3) => {
    return (req, res, next) => {
        const token = req.cookies.jwtToken;
        const options = {
            algorithms: [algorithm]
        };
        if (!token) {
            return res.status(400).json({
                message: "no token recived"
            });
        }
        try {
            const decoded = jwt.verify(token, JWT_Secret, options);
            const { role } = decoded;
            if (requiredRole < role) {
                return res.status(401).json({
                    messegae: "User Role Unauthorized"
                });
            }
            res.locals.jwtPayloadContent = decoded;
            next();
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error("Expired Token");
            }
            else if (error instanceof jwt.JsonWebTokenError) {
                throw new Error("Invalid Token");
            }
            else {
                throw new Error("Someting went wrong authenticating this user");
            }
        }
    };
};
//# sourceMappingURL=jwtUtils.js.map