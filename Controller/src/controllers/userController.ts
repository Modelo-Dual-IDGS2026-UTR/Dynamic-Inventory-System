import { Employee, User, UserRole, UserSession } from "@dis/model";
import { createHash } from 'node:crypto';
import type { Response,Request } from "express";
import { 
    GenerateJWT, 
    generateRefreshToken, 
    verifyRefreshToken, 
    type JwtPayloadContent 
} from "../middleware/jwtUtils.js";
import { FilterOptions } from "../helpers/filterOptions.js";
import { createSessionTokens } from "../services/authService.js";
import { createHistoryLog } from "../helpers/historyHelper.js";

const REPORT_INCLUDES = [
    {
        model: UserRole,
        as: 'related_role',
        attributes: ['roleId', 'roleName']
    },
    {
        model: Employee,
        as: 'employee',
        attributes: ['employeeId', 'firstName', 'lastName', 'email', 'employeeType', 'area', 'status']
    },
];

interface UserResponseData {
    [key: string]: unknown;
    related_role?: { roleId: number; roleName: string } | null;
}

const formatUsers = (userInstance: InstanceType<typeof User>) => {
    const users = userInstance.toJSON() as UserResponseData;
    const {related_role, ...rest} = users;

    return {
        ...rest, 
        fk_role: related_role
            ? { id: related_role.roleId, name: related_role.roleName}
            : null,
    }
}

const REFRESH_TOKEN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;



const CreateUser= async (req:Request,res:Response,)=>{
    
    try {
        const {firstName,lastName, googleUserId, email,area, universityId}=req.body
        if(!firstName||!lastName||!googleUserId||!email||!area){
            return res.status(400).json({
                message: "All fields (firstName,lastName,email,area) are required"
            });
        }
        const normalizedEmail = String(email).trim().toLowerCase()
        const employee = await Employee.findOne({
            where: {
                email: normalizedEmail,
                status: true
            }
        })
        if (universityId && employee) {
            return res.status(400).json({
                message: 'A student account cannot use an employee email'
            })
        }
        const newUser= await User.create({
            firstName,
            lastName,
            email: normalizedEmail,
            area,
            googleUserId,
            universityId,
            employeeId: employee?.getDataValue('employeeId') ?? null,
            fk_role:1
        })
        await createHistoryLog({
            historyDescription: `Se creó el usuario ${firstName} ${lastName}.`,
            actionType: 'CREATE',
            userId: newUser.getDataValue('userId'),
        });
        return res.status(200).json({
            message: "User created"
        })
        
    } catch (error) {
        throw error;
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
        const foundUser = await User.findByPk(convertedId)
        if (!foundUser) {
            return res.status(404).json({
                message: 'User not found'
            })
        }
        const normalizedEmail = email ? String(email).trim().toLowerCase() : foundUser.getDataValue('email')
        const employee = await Employee.findOne({
            where: {
                email: normalizedEmail,
                status: true
            }
        })
        if (universityId && employee) {
            return res.status(400).json({
                message: 'A student account cannot use an employee email'
            })
        }
        if (foundUser.getDataValue('employeeId') && !employee) {
            return res.status(403).json({
                message: 'The employee email must belong to an active employee'
            })
        }

    const [editedRows]=await User.update({
        universityId,
        employeeId: employee?.getDataValue('employeeId') ?? null,
        firstName,
        lastName,
        email: normalizedEmail,
        area,
        fk_role
    },{where:{userId:convertedId}})

    if(editedRows==0){
        return res.status(204).json({
            message:"User not found or no changes were made"
        })
    }
    await createHistoryLog({
        historyDescription: `Se actualizó el usuario ${convertedId}.`,
        actionType: 'UPDATE',
        userId: res.locals.jwtPayloadContent?.userId || convertedId,
    });
    return res.status(200).json({
        message:"User succefully edited"
    })

    }catch (error) {
           throw error;
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
        if (foundUser.getDataValue('employeeId') && universityId) {
            return res.status(400).json({
                message: 'An employee account cannot have universityId'
            })
        }
        if(IsUserComplete(foundUser)){
            return res.status(403).json({
                message:"This user is already complete you cannot edit it"
            })
        }
        const [editedRows]=await User.update({
            universityId,
            area
        },{where:{userId:convertedId}})
        
        if (editedRows > 0) {
            await createHistoryLog({
                historyDescription: `Se completó la información del usuario ${convertedId}.`,
                actionType: 'UPDATE',
                userId: convertedId,
            });
        }
        
        return res.status(200).json({
            message:"User succefully edited"
        })
    } catch (error) {
        throw error;
    }
}

const LogUser= async (req:Request,res:Response)=>{
    //Add Goooooooogle sign in logic and therefore jason jwt web token logic 
    
    try {
        const {sub,email,given_name,family_name}=res.locals.user
        if (!sub || !email) {
            return res.status(401).json({
                message: 'Google account did not provide the required identity'
            })
        }

        const normalizedEmail = String(email).trim().toLowerCase()
        const userSearch=await User.findOne({
            where:{
                googleUserId:sub
            },
            include: REPORT_INCLUDES
        })
        const employee = await Employee.findOne({
            where: {
                email: normalizedEmail,
                status: true
            }
        })
        if(userSearch){
            const linkedUniversityId = userSearch.getDataValue('universityId')
            const linkedEmployeeId = userSearch.getDataValue('employeeId')
            const matchedEmployeeId = employee?.getDataValue('employeeId')
            if (linkedEmployeeId && !employee) {
                return res.status(403).json({
                    message: 'The employee assigned to this user is inactive or not registered'
                })
            }
            if (linkedEmployeeId && matchedEmployeeId && Number(linkedEmployeeId) !== Number(matchedEmployeeId)) {
                return res.status(409).json({
                    message: 'Google account does not match the employee assigned to this user'
                })
            }
            if (employee && !linkedUniversityId && !linkedEmployeeId) {
                await userSearch.update({
                    employeeId: employee.getDataValue('employeeId'),
                    email: normalizedEmail
                })
            }
            const payload:JwtPayloadContent={
                userId:userSearch.getDataValue('userId'),
                role:userSearch.getDataValue('fk_role')
            }
            const { accessToken, refreshToken } = await createSessionTokens(
                payload.userId,
                payload.role
            );

            const isComplete=IsUserComplete(userSearch)

            res.cookie('jwtToken',accessToken,{
                httpOnly:true,
                secure:process.env.NODE_ENV==='production',
                sameSite:'lax',
                maxAge: 15 * 60 * 1000,
                path: '/'
            })

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/api/user'
            });

            return res.status(200).json({
                message:"User Logged in",
                isUserComplete:isComplete,
                employee: employee
                    ? {
                        employeeId: employee.getDataValue('employeeId'),
                        firstName: employee.getDataValue('firstName'),
                        lastName: employee.getDataValue('lastName'),
                        email: employee.getDataValue('email')
                    }
                    : null
            })
        }else{
            const employeeId = employee?.getDataValue('employeeId') ?? null
            const linkedUser = employeeId
                ? await User.findOne({
                    where: { employeeId }
                })
                : null
            if (employeeId && linkedUser && linkedUser.getDataValue('googleUserId') !== sub) {
                return res.status(409).json({
                    message: 'This employee is already linked to another Google account'
                })
            }

            const newUser = linkedUser || await User.create({
                firstName:given_name || employee?.getDataValue('firstName') || 'Pending',
                lastName:family_name || employee?.getDataValue('lastName') || 'User',
                googleUserId:sub,
                email:normalizedEmail,
                area:employee?.getDataValue('area') ?? null,
                fk_role:1
            })
            await createHistoryLog({
                historyDescription: employeeId
                    ? `Se vinculó la cuenta de Google del empleado ${employeeId}.`
                    : `Se creó una cuenta estudiantil pendiente de matrícula.`,
                actionType: 'CREATE',
                userId: newUser.getDataValue('userId'),
            });
            const payload:JwtPayloadContent={
                userId:newUser.getDataValue('userId'),
                role:newUser.getDataValue('fk_role')
            }
            const { accessToken, refreshToken } = await createSessionTokens(
                payload.userId,
                payload.role,
            );
            const isComplete=IsUserComplete(newUser)
            res.cookie('jwtToken',accessToken,{
                httpOnly:true,
                secure:process.env.NODE_ENV==='production',
                sameSite:'lax',
                maxAge: 15 * 60 * 1000,
                path: '/'
            })
            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: REFRESH_TOKEN_DURATION_MS,
                path: '/api/user'
            })
            return res.status(200).json({
                message:"User Created",
                isUserComplete:isComplete,
                employee: employee
                    ? {
                        employeeId,
                        firstName: employee.getDataValue('firstName'),
                        lastName: employee.getDataValue('lastName'),
                        email: employee.getDataValue('email')
                    }
                    : null
            })

        }
        
    } catch (error) {
        throw error;
    }
}

const RefreshToken = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

     if (!refreshToken) {
        return res.status(401).json({
            message: 'Refresh token not received'
        });
    }

    try {
        const decoded = verifyRefreshToken(refreshToken);

        const user = await User.findByPk(decoded.userId);

        if (!user) {
            return res.status(401).json({
                message: 'User from refresh token was not found',
                userId: decoded.userId
            });
        }

        const userStatus = user.getDataValue('userStatus');
        if (userStatus !== true && userStatus !== 1) {
            return res.status(401).json({
                message: 'User is not authorized',
                userId: decoded.userId,
                userStatus
            });
        }

        const payload: JwtPayloadContent = {
            userId: user.getDataValue('userId'),
            role: user.getDataValue('fk_role')
        };

        const newAccessToken = GenerateJWT(payload);

        //Refresh token rotation
        const session = await UserSession.findOne({
            where: {
                sessionId: decoded.sessionId,
                userId: decoded.userId,
                revokedAt: null
            }
        });

        //PUEDE SER ESTA BLOWJOB
        if (!session) {
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/api/user'
            });
            return res.status(401).json({
                message: (`Session not found or revoked`)
            });
        }

        const expiresAt = session.getDataValue('expiresAt') as Date;
        if (expiresAt.getTime() <= Date.now()) {
            await session.destroy();
            return res.status(401).json({
                message: 'Refresh session expired'
            });
        }

        const receivedTokenHash = createHash('sha256')
            .update(refreshToken)
            .digest('hex');

        if (receivedTokenHash !== session.getDataValue('refreshTokenHash')) {
            await session.update({ revokedAt: new Date() });
            return res.status(401).json({
                message: 'Invalid refresh token'
            });
        }

        const newRefreshToken = generateRefreshToken({
            userId: payload.userId,
            sessionId: decoded.sessionId
        });

        const newRefreshTokenHash = createHash('sha256')
            .update(newRefreshToken)
            .digest('hex');

        const [updatedSessions] = await UserSession.update({
            refreshTokenHash: newRefreshTokenHash
        }, {
            where: {
                sessionId: decoded.sessionId,
                userId: decoded.userId,
                revokedAt: null,
                refreshTokenHash: receivedTokenHash
            }
        });

        if (updatedSessions !== 1) {
            return res.status(401).json({
                message: 'Refresh token already rotated or session revoked'
            });
        }

        
        res.cookie('jwtToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000,
            path: '/'
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/api/user'
        });

        return res.status(200).json({
            message: 'Token refreshed'
        });
    } catch {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/user'
        });

        return res.status(401).json({
            message: 'Invalid or expired refresh token'
        });
    }
};

const Logout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
        try {
            const decoded = verifyRefreshToken(refreshToken);

            await UserSession.destroy({
                where: {
                    sessionId: decoded.sessionId,
                    userId: decoded.userId
                }
            });
        } catch {
            // The cookies are cleared even when the refresh token is invalid.
        }
    }

    res.clearCookie('jwtToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/user' });

    return res.status(204).send();
};

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
         throw error;
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
         throw error;
    }
}


function IsUserComplete(user:InstanceType<typeof User>):boolean {
    const userData=user.toJSON()
    const hasRequiredIdentity = Boolean(userData.universityId || userData.employeeId)
    const requiredFields = [
        userData.firstName,
        userData.lastName,
        userData.email,
        userData.fk_role
    ]

    return hasRequiredIdentity && requiredFields.every(Boolean)
}
async function ShowUser(id:number,res:Response){
    
    const foundUser=await User.findByPk(id, {
        include: REPORT_INCLUDES
    })
        
        if(!foundUser){
            return res.status(404).json({
                message:"User not found or does not exist"
            })
        };
       
        return res.status(200).json(formatUsers(foundUser))

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
        throw error;
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
        
        if (userStatus === foundUser.getDataValue('userStatus')){
            return res.status(400).json({ message: 'The status could not change because is the same status' });
        }

        foundUser.set('userStatus', userStatus);

        await foundUser.save();
        const userName = `${foundUser.getDataValue('firstName')} ${foundUser.getDataValue('lastName')}`;
        await createHistoryLog({
            historyDescription: `Se actualizó el estado del usuario "${userName}" (#${parsedUserId}) a ${userStatus}.`,
            actionType: 'UPDATE',
            userId: res.locals.jwtPayloadContent?.userId || parsedUserId,
        });
        return res.status(200).json({ message: 'User status successfully updated' });
    } catch (error) {
        throw error;
    }
}

const promotion = async (req: Request, res: Response) => {
    try {
        const parsedUserId = Number(req.params.userId);
        const {fk_role} = req.body;
        if (!parsedUserId || !fk_role) {
            return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
        }

        const foundUser = await User.findByPk(parsedUserId);
        if (!foundUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (Number(fk_role) === Number(foundUser.getDataValue('fk_role'))){
            return res.status(400).json({ message: 'The role could not change because is the same role' });
        }

        foundUser.set('fk_role', fk_role);

        await foundUser.save();
        const userName = `${foundUser.getDataValue('firstName')} ${foundUser.getDataValue('lastName')}`;
        await createHistoryLog({
            historyDescription: `Se actualizó el rol del usuario "${userName}" (#${parsedUserId}) a ${fk_role}.`,
            actionType: 'UPDATE',
            userId: res.locals.jwtPayloadContent?.userId || parsedUserId,
        });
        return res.status(200).json({ message: 'User role successfully updated' });
    } catch (error) {
        throw error;
    }
}

const deleteUser = async (req: Request, res: Response) => {
    try {
        const parsedUserId = Number(req.params.userId);
        if (!parsedUserId) {
            return res.status(400).json({ message: 'All parameters must be filled in, please check documentation' });
        }

        const foundUser = await User.findByPk(parsedUserId);
        if (!foundUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        await createHistoryLog({
            historyDescription: `Se eliminó el usuario ${parsedUserId}.`,
            actionType: 'DELETE',
            userId: res.locals.jwtPayloadContent?.userId || parsedUserId,
        });
        await foundUser.destroy();
        return res.status(200).json({ message: 'User successfully deleted' });
    } catch (error) {
         throw error;
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
        throw error;
    }
} */




export {
    CreateUser,
    LogUser,
    UpdateUser,
    WhoAmI,
    SearchUserById,
    FullfilUser,
    ShowAllUsers,
    changeStatus,
    promotion,
    deleteUser,
    RefreshToken,
    Logout
}
