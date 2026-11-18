import { 
    downloadEmployeeImportTemplate,
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
import { uploadSpreadsheetSingle } from "../middleware/csvUpload.js";
export const employeeRouter=express.Router();

employeeRouter.get('/import-template', VerifyJWT(1), downloadEmployeeImportTemplate);

employeeRouter.post('/import-employees', VerifyJWT(1), uploadSpreadsheetSingle('file'), importEmployees);

employeeRouter.get('/all-employees', VerifyJWT(1), ShowAllEmployees);

employeeRouter.get('/find-employee/:employeeId', VerifyJWT(1), SearchEmployeeById);

employeeRouter.post('/create-employee', VerifyJWT(1), CreateEmployee);

employeeRouter.put('/update-employee/:employeeId', VerifyJWT(1), UpdateEmployee);

employeeRouter.patch('/change-status/:employeeId', VerifyJWT(1), changeEmployeeStatus);

employeeRouter.delete('/delete-employee/:employeeId', VerifyJWT(1), deleteEmployee);