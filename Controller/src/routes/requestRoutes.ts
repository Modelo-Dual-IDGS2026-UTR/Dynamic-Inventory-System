import express from 'express';
import { requestController } from '../controllers/requestController.js';
import { VerifyJWT } from '../middleware/jwtUtils.js';

export const requestRouter = express.Router();

requestRouter.post('/create-request/', VerifyJWT(2), requestController.CreateRequest);
requestRouter.get('/user-requests/:userId', VerifyJWT(3), requestController.GetUserRequests);
requestRouter.get('/all-requests/', VerifyJWT(2), requestController.GetAllRequests);
requestRouter.get('/one-request/:id', VerifyJWT(3), requestController.GetRequest);
requestRouter.patch('/accept-request/', VerifyJWT(2), requestController.AcceptRequest);
requestRouter.patch('/reject-request/', VerifyJWT(2), requestController.RejectRequest);
requestRouter.delete('/delete-request/:id', VerifyJWT(1), requestController.DeleteRequest);
