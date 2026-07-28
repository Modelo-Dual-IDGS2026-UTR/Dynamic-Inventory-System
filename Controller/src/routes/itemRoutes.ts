import { itemController } from "../controllers/itemController.js";
import  express  from "express";
export const itemRouter=express.Router()

itemRouter.post('/new-item',itemController.CreateItem)

itemRouter.get('/read-item/:itemId',itemController.SearchItemById)

itemRouter.post('/read-items',itemController.SearchItems)

itemRouter.put('/update-item/:itemId',itemController.UpdateItem)

itemRouter.delete('/delete-item/:itemId',itemController.DeleteItemByID)