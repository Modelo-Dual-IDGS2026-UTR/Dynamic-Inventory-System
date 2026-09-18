import { User, UserRole } from "@dis/model";
import type { Response,Request } from "express";
import { GenerateJWT, type jwtPayloadContent } from "../middleware/jwtUtils.js";
import { type WhereOptions } from 'sequelize';

const REPORT_INCLUDES = [
    {
        model: UserRole,
        as: 'related_role',
        attributes: ['roleId', 'roleName']
    },
];

const formatUsers = (userInstance: any) => {
    const users = typeof userInstance.toJSON === 'function' ? userInstance.toJSON() : userInstance;
    const {related_role, ...rest} = users;

    return {
        ...rest, 
        fk_role: related_role
            ? { id: related_role.roleId, name: related_role.roleName}
            : null,
    }
}

const CreateUser= async (req:Request,res:Response,)=>{
    
    try {
        const {firstName,lastName, googleUserId, email,area}=req.body
        if(!firstName||!lastName||!googleUserId||!email||!area){
            return res.status(400).json({
                message: "All fields (firstName,lastName,email,area) are required"
            });
        }
        const newUser= await User.create({
            firstName,
            lastName,
            email,
            area,
            googleUserId,
            fk_role:1
        })
        return res.status(200).json({
            message: "User created"
        })
        
    } catch (error) {
        return res.status(500).json({

            message:"Internal Error: Dont Worry Is Not Your fault :D",
            error: error
        })
    }
};

const UpdateUser=async (req:Request,res:Response)=>{
    try {
        const id=req.params.userId
        const body=req.body||{}
        const {universityId,firstName,lastName,email,area,fk_role}=body
        if(!id){
            return res.status(400).json({
            message:"No User ID given"
        })
        }
        const convertedId=Number(id)
        if(isNaN(convertedId) || !Number.isInteger(convertedId) || convertedId <= 0){
          return res.status(400).json({
            message:"Invalid User ID"
        })  
        

    } 
    const [editedRows]=await User.update({
        universityId,
        firstName,
        lastName,
        email,
        area,
        fk_role
    },{where:{userId:convertedId}})

    if(editedRows==0){
        return res.status(204).json({
            message:"User not found or no changes were made"
        })
    }
    return res.status(200).json({
        message:"User succefully edited"
    })

    }catch (error) {
           return res.status(500).json({
            message:"Internal Error: Dont Worry Is Not Your fault :D",
            error: error
        })
    }
}

const FullfilUser=async (req:Request,res:Response)=>{
    try {
        const id=res.locals.jwtPayloadContent.userId
        const body=req.body||{}
        const {universityId,area}=body
            if(!id){
            return res.status(400).json({
            message:"No User ID given"
        })
        }
        const convertedId=Number(id)
        if(isNaN(convertedId) || !Number.isInteger(convertedId) || convertedId <= 0){
          return res.status(400).json({
            message:"Invalid User ID"
        })}
        const foundUser=await User.findByPk(convertedId)
        if(!foundUser)return res.status(204).json({message:"User not found"})
        if(IsUserComplete(foundUser)){
            return res.status(403).json({
                message:"This user is already complete you cannot edit it"
            })
        }
        const [editedRows]=await User.update({
            universityId,
            area
        },{where:{userId:convertedId}})
        
        
        return res.status(200).json({
            message:"User succefully edited"
        })
    } catch (error) {
        return res.status(500).json({
            message:"Internal Error: Dont Worry Is Not Your fault :D",
            error: error
        })
    }
}

const LogUser= async (req:Request,res:Response)=>{
    //Add Goooooooogle sign in logic and therefore jason jwt web token logic 
    
    try {
        const {sub,email,given_name,family_name}=res.locals.user
        const userSearch=await User.findOne({
                where:{
                    googleUserId:sub
                }
            })
        if(userSearch){
            const payload:jwtPayloadContent={
                userId:userSearch.getDataValue('userId'),
                role:userSearch.getDataValue('fk_role')
            }
            const token=GenerateJWT(payload)


            const isComplete=IsUserComplete(userSearch)
            res.cookie('jwtToken',token,{
                httpOnly:true,
                secure:process.env.NODE_ENV==='production',
                sameSite:'lax',
                maxAge: 24 * 60 * 60 * 1000
            })
            return res.status(200).json({
                message:"User Logged in",
                isUserComplete:isComplete
            })
        }else{
            const newUser= await User.create({
            firstName:given_name,
            lastName:family_name,
            googleUserId:sub,
            email,
            area:null,
            fk_role:1
        })
            const payload:jwtPayloadContent={
                userId:newUser.getDataValue('userId'),
                role:newUser.getDataValue('fk_role')
            }
            const token=GenerateJWT(payload)
            const isComplete=IsUserComplete(newUser)
            res.cookie('jwtToken',token,{
                httpOnly:true,
                secure:process.env.NODE_ENV==='produciton',
                sameSite:'lax',
                maxAge: 24 * 60 * 60 * 1000
            })
            return res.status(200).json({
                message:"User Created",
                isUserComplete:isComplete
            })

        }
        
    } catch (error) {
        return res.status(500).json({
            message:"Internal Error: Dont Worry Is Not Your fault :D",
            error: error
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
            message:"Internal Error: Dont Worry Is Not Your fault :D",
            error:error
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
           message:"Internal Error: Dont Worry Is Not Your fault :D",
            error:error
        })
    }
}


function IsUserComplete(user:InstanceType<typeof User>):boolean {
    const userData=user.toJSON()
    for(const value of Object.values(userData)){
        if(value==null){
            return false
        }
    }
    return true


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

const ShowAllUsers = async (req: Request, res: Response) => {
    try {
        const {
            userId,
            googleUserId,
            universityId,
            firstName,
            lastName,
            userStatus,
            email,
            area,
            fk_role,
            sortBy = 'userId',
            order = 'ASC'
        } = req.body || {};

        const searchOptions = FilterOptions({
            userId,
            googleUserId,
            universityId,
            firstName,
            lastName,
            userStatus,
            email,
            area,
            fk_role
        })

        const foundUsers = await User.findAll({
            where: searchOptions,
            include: REPORT_INCLUDES,
            order: [[sortBy, String(order).toUpperCase()]],
        });

        return res.status(200).json(foundUsers.map(formatUsers));
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
    }
}


const changeStatus = async (req: Request, res: Response) => {
    try {
        const parsedUserId = Number(req.params.userId);
        const {userStatus} = req.body;
        if (!parsedUserId) {
            return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
        }

        const foundUser = await User.findByPk(parsedUserId);
        if (!foundUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        foundUser.set('userStatus', userStatus);

        await foundUser.save();
        return res.status(200).json({ message: 'User status successfully updated' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
    }
}

//Not necessary because of google sign in
/* const changeUserPassword = async (req: Request, res: Response) => {
    try {
        const parsedUserId = Number(req.params.userId);
        const password = req.body;
        if (!parsedUserId) {
            return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
        }

        const foundUser = await User.findByPk(parsedUserId);
        if (!foundUser) {
            return res.status(404).json({ message: 'Report not found' });
        }
        
        foundUser.set('password', password);

        await foundUser.save();
        return res.status(200).json({ message: 'Report status successfully updated' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error, not your fault :D', error });
    }
} */

function FilterOptions<T extends object = Record<string, unknown>>(filter: Record<string, unknown>): WhereOptions<T> {
    const whereClause: WhereOptions<T> = {};
    Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            (whereClause as Record<string, unknown>)[key] = value;
        }
    });
    return whereClause;
}


export {
    CreateUser,
    LogUser,
    UpdateUser,
    WhoAmI,
    SearchUserById,
    FullfilUser,
    ShowAllUsers,
    changeStatus
}

