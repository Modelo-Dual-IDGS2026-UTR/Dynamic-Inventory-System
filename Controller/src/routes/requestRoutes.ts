import express from 'express';
import {
    AcceptRequest,
    CreateRequest,
    DeleteRequest,
    RejectRequest,
    SearchAllRequests,
    SearchReceivedRequests,
    SearchRequestById,
    SearchUserRequests,
    SetRequestReceiver,
    UpdatePendingRequest,
    RequestSummary
} from '../controllers/requestController.js';
import { VerifyJWT } from '../middleware/jwtUtils.js';

export const requestRouter = express.Router();

requestRouter.post('/create-request', VerifyJWT(2), CreateRequest);

requestRouter.get('/user-requests/:userId', VerifyJWT(), SearchUserRequests);

requestRouter.get('/received-requests/:userId', VerifyJWT(), SearchReceivedRequests);

requestRouter.get('/all-requests', VerifyJWT(2), SearchAllRequests);

requestRouter.get('/request-summary', VerifyJWT(2), RequestSummary);

requestRouter.get('/one-request/:id', VerifyJWT(), SearchRequestById);

requestRouter.patch('/accept-request/:requestId', VerifyJWT(2), AcceptRequest);

requestRouter.patch('/reject-request/:requestId', VerifyJWT(2), RejectRequest);

requestRouter.patch('/set-receiver/:requestId', VerifyJWT(2), SetRequestReceiver);

requestRouter.put('/update-request/:requestId', VerifyJWT(2), UpdatePendingRequest);
requestRouter.delete('/delete-request/:id', VerifyJWT(1), DeleteRequest);
