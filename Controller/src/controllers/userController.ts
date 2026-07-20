import { mySequelize } from "@dis/db/dbConection.js";
import { User,UserRole } from "@dis/model";
import bcrypt from "bcryptjs";
import type { Response,Request } from "express";



export const CreateUser= async (res:Response,req:Request)=>{
    
    
    try {
        const {firstName,lastName,email,area}=req.body
        if(!firstName||!lastName||!email||!area){
            return res.status(400).json({
                message: "All fields (firstName,lastName,email,area) are required"
            });
        }
        const newUser= await User.create({
            firstName,
            lastName,
            email,
            area,
            fk_role:1
        })
        return res.status(200).json({
            message: "User created"
        })
        
    } catch (error) {
        return res.status(500).json({
            message:"Internal Error: Dont Worry Is Not Your fault :D"
        })
    }
};

export const LogUser= async (res:Response,req:Request)=>{
    try {
        const {firstName,lastName,email}=req.body
        const userSearch=await User.findOne({
                where:{
                    firstName,
                    lastName,
                    email
                }
            })
        if(!userSearch){
            return res.status(404).json({
                message:"User not found"
            })
        }
        

        
    } catch (error) {
        return res.status(500).json({
            message:"Internal Error: Dont Worry Is Not Your fault :D"
        })
    }
}