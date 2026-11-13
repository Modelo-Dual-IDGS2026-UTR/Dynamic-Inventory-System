import { 
    CreateItem,
    SearchItemById,
    SearchItems,
    UpdateItem,
    DeleteItemByID,
    SetStatus,
    SetCategory,
    ChangeResponsible,
    importItems,
    downloadItemImportTemplate
} from "../controllers/itemController.js";
import  express  from "express";
export const itemRouter=express.Router();
import { VerifyJWT } from '../middleware/jwtUtils.js';
import { publicCatalogLimiter } from '../middleware/publicCatalogLimiter.js';
import { uploadSpreadsheetSingle } from '../middleware/csvUpload.js';

//Admin & Superadmin
itemRouter.post('/new-item', VerifyJWT(2), CreateItem);

//Download template
itemRouter.get('/import-template', VerifyJWT(2), downloadItemImportTemplate);

//Import items
itemRouter.post('/import-items', VerifyJWT(2), uploadSpreadsheetSingle('file'), importItems);

// Public inventory catalog
itemRouter.get('/read-item/:itemId', VerifyJWT(), publicCatalogLimiter, SearchItemById);

// Public inventory catalog
itemRouter.get('/read-items', VerifyJWT(), publicCatalogLimiter, SearchItems);

//Admin & Superadmin
itemRouter.put('/update-item/:itemId',  VerifyJWT(2), UpdateItem);

//Admin & Superadmin
itemRouter.patch('/set-status/:itemId', VerifyJWT(2), SetStatus);

//Admin & Superadmin
itemRouter.patch('/set-category/:itemId', VerifyJWT(2), SetCategory);

//Superadmin
itemRouter.patch('/assign-responsible/:itemId', VerifyJWT(1), ChangeResponsible);

//Superadmin
itemRouter.delete('/delete-item/:itemId',  VerifyJWT(1), DeleteItemByID);