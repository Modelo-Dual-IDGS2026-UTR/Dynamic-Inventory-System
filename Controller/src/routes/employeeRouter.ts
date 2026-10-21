import { 
    importEmployees,

} from "../controllers/employeeController.js";
import  express  from "express";
export const employeeRouter=express.Router();

import multer from 'multer';
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, 
    },
    fileFilter: (_req, file, callback) => {
        if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
            callback(null, true);
        } else {
            callback(new Error('Solo se permiten archivos CSV'));
        }
    }
})

employeeRouter.post(
    '/import',
    upload.single('file'),
    importEmployees
);