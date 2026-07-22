import express from 'express'
import { VerifyJWT } from '../middleware/jwtUtils.js'
import { userController } from '../controllers/userController.js'


export const userRouter= express.Router()



userRouter.post('/register',VerifyJWT(),userController.CreateUser)

userRouter.get('/findUser/:userId',VerifyJWT(),userController.SearchUserById)

userRouter.get('/me',VerifyJWT(),userController.WhoAmI)


