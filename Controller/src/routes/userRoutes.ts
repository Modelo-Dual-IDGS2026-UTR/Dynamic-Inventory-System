import express from 'express'
import { VerifyJWT } from '../middleware/jwtUtils.js'

const router= express.Router()

const userController = require('../controllers/userController')


router.post('/register',userController.CreateUser)

router.get('/me',VerifyJWT,userController.WhoAmI)



