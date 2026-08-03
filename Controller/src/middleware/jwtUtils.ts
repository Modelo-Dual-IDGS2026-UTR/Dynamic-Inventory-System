import jwt from 'jsonwebtoken';
import type {SignOptions, VerifyOptions} from 'jsonwebtoken';
import type { Response,Request,NextFunction } from 'express';

export interface jwtPayloadContent{
    userId:number,
    role:number,
};

const JWT_Secret=process.env.JWT_SECRET;

const algorithm='HS256';


if(!JWT_Secret){
    throw new Error("\n------FATAL ERROR: No jwt secret defined---------\n");
}
export const GenerateJWT=(payload:jwtPayloadContent, expiresIn: SignOptions["expiresIn"] = 15000): string =>{
    const options: SignOptions = {
        expiresIn,
        algorithm

    };

    return jwt.sign(payload,JWT_Secret,options);

}

export const VerifyJWT=(requiredRole:number=3)=>{
    
    return (req:Request,res:Response, next:NextFunction)=>{

    const token=req.cookies.jwtToken
    const options: VerifyOptions = {
        algorithms:[algorithm]
    }
    if(!token){
        return res.status(400).json({
            message: "no token recived"
        })
    }
    try{
        const decoded = jwt.verify(token,JWT_Secret,options) as jwtPayloadContent;
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
            throw new Error("Expired Token");
        } else if (error instanceof jwt.JsonWebTokenError){
            throw new Error("Invalid Token");
        }else{
            throw new Error("Someting went wrong authenticating this user");
        }
    }
}

}
