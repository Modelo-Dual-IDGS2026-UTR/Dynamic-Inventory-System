import express from 'express'
import { VerifyJWT } from '../middleware/jwtUtils.js'
import { userController } from '../controllers/userController.js'
import { VerifyGoogleToken } from '../middleware/googleToken.js'

export const userRouter= express.Router()



userRouter.post('/create-user',VerifyJWT(1),userController.CreateUser)



userRouter.get('/login',VerifyGoogleToken,userController.LogUser)
//Add endpoint to docs

userRouter.get('/find-user/:userId',VerifyJWT(),userController.SearchUserById)

userRouter.get('/me',VerifyJWT(),userController.WhoAmI)

userRouter.put('/update-user/:userId',VerifyJWT(1),userController.UpdateUser)

userRouter.put('/complete-user',VerifyJWT(),userController.FullfilUser)

