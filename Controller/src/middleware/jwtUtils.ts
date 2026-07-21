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

export const VerifyJWT=(req:Request,res:Response, next:NextFunction)=>{
    
    const {token}=req.body
    const options: VerifyOptions = {
        algorithms:[algorithm]
    }

    try{
        const decoded = jwt.verify(token,JWT_Secret,options) as jwtPayloadContent;
        return res.status(200).json(
            {
                token: decoded

            })
    }catch(error){
        if (error instanceof jwt.TokenExpiredError){
            throw new Error("Expired Token");
        } else if (error instanceof jwt.JsonWebTokenError){
            throw new Error("Invalid Token");
        }else{
            throw new Error("Someting went wrong authenticating this user");
        }
        throw new Error ("Auth_error")
    }
    

}