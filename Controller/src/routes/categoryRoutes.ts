import { VerifyJWT } from '../middleware/jwtUtils.js';
import { 
    AllCategories,
    SearchCategoryById,
    CreateCategory,
    UpdateCategory,
    DeleteCategoryByID

} from "../controllers/categoryController.js";

import  express  from "express";
export const categoryRouter=express.Router();

//////////////////////SUPERADMIN/////////////////////////

categoryRouter.post('/create-category', VerifyJWT(1), CreateCategory);

categoryRouter.get('/all-categories', VerifyJWT(1), AllCategories);

categoryRouter.get('/find-category/:categoryId', VerifyJWT(1), SearchCategoryById);

categoryRouter.put('/update-category/:categoryId', VerifyJWT(1), UpdateCategory);

categoryRouter.delete('/delete-category/:categoryId', VerifyJWT(1), DeleteCategoryByID);


