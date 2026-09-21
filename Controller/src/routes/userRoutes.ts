import express from 'express';
import { VerifyJWT } from '../middleware/jwtUtils.js';
import {
    CreateUser,
    LogUser,
    UpdateUser,
    WhoAmI,
    SearchUserById,
    FullfilUser,
    ShowAllUsers,
    changeStatus,
    promotion,
    deleteUser
    } from '../controllers/userController.js';
import { VerifyGoogleToken } from '../middleware/googleToken.js';

export const userRouter= express.Router();

//====================== USERS ====================================

userRouter.get('/login',VerifyGoogleToken, LogUser);

//DONT FORGET TO ADD VERIFICATION :D


userRouter.put('/complete-user',VerifyJWT(), FullfilUser);

//refresh

userRouter.get('/me',VerifyJWT(), WhoAmI);

//userRouter.get('/find-user/:userId',VerifyJWT(),userController.SearchUserById)

// ========================= SUPERADMIN ==============================
userRouter.get('/find-user/:userId', SearchUserById);

userRouter.put('/update-user/:userId',VerifyJWT(1), UpdateUser);

userRouter.post('/create-user', CreateUser);

userRouter.get('/all-users', ShowAllUsers);

userRouter.patch('/change-status/:userId', changeStatus);

userRouter.patch('/promotion/:userId', promotion);

userRouter.delete('/delete-user/:userId', deleteUser);



//This endpoint resulted innecessary with the google sign in
//Saving it in case another way to login is required to be implemented
//userRouter.patch('/change-password/:userId', changeUserPassword);

