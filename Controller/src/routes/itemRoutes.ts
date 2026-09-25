import { 
    CreateItem,
    SearchItemById,
    SearchItems,
    UpdateItem,
    DeleteItemByID,
    SetStatus
} from "../controllers/itemController.js";
import  express  from "express";
export const itemRouter=express.Router();
import { VerifyJWT } from '../middleware/jwtUtils.js';

//Admin & Superadmin
itemRouter.post('/new-item', VerifyJWT(2), CreateItem);

//No Security
itemRouter.get('/read-item/:itemId', SearchItemById);

//No Security
itemRouter.get('/read-items', SearchItems);

//Admin & Superadmin
itemRouter.put('/update-item/:itemId',  VerifyJWT(2), UpdateItem);

itemRouter.patch('/set-status/:itemId', VerifyJWT(2), SetStatus);

//Superadmin
itemRouter.delete('/delete-item/:itemId',  VerifyJWT(1), DeleteItemByID);