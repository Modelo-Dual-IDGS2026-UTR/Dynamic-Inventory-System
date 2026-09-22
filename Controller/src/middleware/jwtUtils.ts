import jwt from 'jsonwebtoken';
import type {SignOptions, VerifyOptions} from 'jsonwebtoken';
import type { Response,Request,NextFunction } from 'express';

export interface JwtPayloadContent{
    userId:number,
    role:number,
};

export interface RefreshTokenPayload {
    userId: number;
    sessionId: string;
}

const accessSecret=process.env.JWT_SECRET;
const refreshSecret=process.env.JWT_REFRESH_SECRET;
const algorithm='HS256';


if(!accessSecret || !refreshSecret){
    throw new Error("\n------FATAL ERROR: No jwt secret defined---------\n");
}

export const GenerateJWT=(payload:JwtPayloadContent, expiresIn: SignOptions["expiresIn"] = "1m"): string =>{
    const options: SignOptions = {
        expiresIn,
        algorithm

    };
    return jwt.sign(payload,accessSecret,options);
}

export const generateRefreshToken = (
    payload: RefreshTokenPayload
): string => {
    return jwt.sign(payload, refreshSecret, {
        algorithm,
        expiresIn: '7d'
    });
};

export const verifyRefreshToken = (
    token: string
): RefreshTokenPayload => {
    return jwt.verify(token, refreshSecret, {
        algorithms: [algorithm]
    }) as RefreshTokenPayload;
};

export const VerifyJWT=(requiredRole:number=3)=>{
    
    return (req:Request,res:Response, next:NextFunction)=>{

    const token=req.cookies.jwtToken
    const options: VerifyOptions = {
        algorithms:[algorithm]
    }
    if(!token){
        return res.status(400).json({
            message: "no token received"
        })
    }
    try{
        const decoded = jwt.verify(token,accessSecret,options) as JwtPayloadContent;
        const {role}=decoded
        if(requiredRole<role){
            return res.status(401).json({
                messegae:"User Role Unauthorized"
            })
        }
        res.locals.jwtPayloadContent = decoded
        next()
    }catch(error){
        if (error instanceof jwt.TokenExpiredError){
            return res.status(401).json({
                message: 'Access token expired'
            });
        } 
        
        if (error instanceof jwt.JsonWebTokenError){
            return res.status(401).json({
                message: 'Invalid access token'
            });
        }

        return res.status(401).json({
            message: 'Authentication failed'
        });
    }
}

}
