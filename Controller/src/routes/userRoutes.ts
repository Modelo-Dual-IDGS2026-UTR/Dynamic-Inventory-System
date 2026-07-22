import express from 'express'
import { VerifyJWT } from '../middleware/jwtUtils.js'
import { userController } from '../controllers/userController.js'


export const userRouter= express.Router()



userRouter.post('/register',userController.CreateUser)

userRouter.get('/findUser/:userId',userController.SearchUserById)

userRouter.get('/me',VerifyJWT(1),userController.WhoAmI)


