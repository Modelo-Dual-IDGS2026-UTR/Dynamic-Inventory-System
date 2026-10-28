import { 
    importEmployees,
    ShowAllEmployees,
    CreateEmployee,
    SearchEmployeeById,
    UpdateEmployee,
    changeEmployeeStatus,
    deleteEmployee
} from "../controllers/employeeController.js";
import  express  from "express";
import { VerifyJWT } from "../middleware/jwtUtils.js";
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

employeeRouter.post('/import-employees', VerifyJWT(1), upload.single('file'), importEmployees
);

employeeRouter.get('/all-employees', VerifyJWT(1), ShowAllEmployees);

employeeRouter.get('/find-employee/:employeeId', VerifyJWT(1), SearchEmployeeById);

employeeRouter.post('/create-employee', VerifyJWT(1), CreateEmployee);

employeeRouter.put('/update-employee/:employeeId', VerifyJWT(1), UpdateEmployee);

employeeRouter.patch('/change-status/:employeeId', VerifyJWT(1), changeEmployeeStatus);

employeeRouter.delete('/delete-employee/:employeeId', VerifyJWT(1), deleteEmployee);