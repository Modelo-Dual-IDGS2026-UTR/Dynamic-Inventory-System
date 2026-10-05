import { VerifyJWT } from '../middleware/jwtUtils.js';
import { 
    AllItemHistory
} from "../controllers/historyController.js";
import  express  from "express";
export const historyRouter=express.Router();

historyRouter.get('/item-history/:itemId', AllItemHistory);
