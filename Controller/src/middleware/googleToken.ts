import express, { type NextFunction, type Request, type Response } from 'express'
import { OAuth2Client } from 'google-auth-library'

const GoogleClientID = process.env.VITE_GOOGLE_CLIENT_ID||""
const client = new OAuth2Client(GoogleClientID)

export const VerifyGoogleToken=async(req:Request,res:Response,next:NextFunction)=>{
    try {
        const rawToken=req.headers.authorization
        if(!rawToken||!rawToken.startsWith('Bearer ')){
            return res.status(401).json({
                message:"No token recived: ACCESS DENIED .|." 
            })
        }
        const uncodedToken=rawToken.split(' ')[1]
        if(!uncodedToken){
            return res.status(401).json({
                message:"No token recived: ACCESS DENIED .|." 
            })
        }
        const ticket= await client.verifyIdToken({
            idToken:uncodedToken,
            audience: GoogleClientID
        })
        const payload=ticket.getPayload()||{}
        
        res.locals.user=payload
        next()


        
    } catch (error) {
         res.status(500).json({
            message:"Internal server error, not your fault :D",
            error:error})
    }
    

}