import { VerifyJWT } from '../middleware/jwtUtils.js';
import { 
    AllItemHistory,
    AllUserHistory
} from "../controllers/historyController.js";
import  express  from "express";
export const historyRouter=express.Router();

historyRouter.get('/item-history/:itemId', VerifyJWT(2), AllItemHistory);

historyRouter.get('/user-history/:userId', VerifyJWT(2), AllUserHistory);