import { 
    CreateItem,
    SearchItemById,
    SearchItems,
    UpdateItem,
    DeleteItemByID,
    SetStatus,
    SetCategory
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

//Admin & Superadmin
itemRouter.patch('/set-status/:itemId', VerifyJWT(2), SetStatus);

//Admin & Superadmin
itemRouter.patch('/set-category/:itemId', VerifyJWT(2), SetCategory);

//Superadmin
itemRouter.delete('/delete-item/:itemId',  VerifyJWT(1), DeleteItemByID);