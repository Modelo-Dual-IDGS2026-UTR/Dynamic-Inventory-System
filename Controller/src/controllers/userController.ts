import { mySequelize } from "@dis/db/dbConection.js";
import { User,UserRole } from "@dis/model";
import type { Response,Request } from "express";


const CreateUser= async (req:Request,res:Response,)=>{
    
    
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

const LogUser= async (req:Request,res:Response)=>{
    //Add Goooooooogle sign in logic and therefore jason jwt web token logic 
    
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

const SearchUserById=async (req:Request,res:Response)=>{
    const id=req.params.userId
    if(!id){
        return res.status(400).json({
            message:"No User ID given"
        })
    }
    try {
        const convertedId=Number(id)
        if(isNaN(convertedId) || !Number.isInteger(convertedId) || convertedId <= 0){
          return res.status(400).json({
            message:"Invalid User ID"
        })  
        }
        ShowUser(convertedId,res);
        
    } catch (error) {
         return res.status(500).json({
            message:"Internal Error: Dont Worry Is Not Your fault :D"
        })
    }
}
const WhoAmI=(req:Request,res:Response)=>{
    const {userId}=res.locals.jwtPayloadContent
    if(!userId){
        return res.status(400).json({
            message:"no ID recived"
        })
    }
    try {
        ShowUser(userId,res)
    } catch (error) {
         return res.status(500).json({
            message:"Internal Error: Dont Worry Is Not Your fault :D"
        })
    }
}

async function ShowUser(id:number,res:Response){

    const foundUser=await User.findByPk(id)
        if(!foundUser){
            return res.status(404).json({
                message:"User not found or does not exist"
            })
        }
       
        return res.status(200).json(foundUser.toJSON())

} 

export const userController={
    CreateUser,
    LogUser,
    WhoAmI,
    SearchUserById
}