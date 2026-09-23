import {
    CreateReport,
    SearchReportById,
    SearchReports,
    SearchReportsCreatedUser,
    SetReportStatus,
    SetDueDate,
    setPriority,
    deleteReport
} from "../controllers/reportController.js";
import { VerifyJWT } from '../middleware/jwtUtils.js';

import  express  from "express";
export const reportRouter=express.Router();

//Remember to implement JWT to protect the routes

//Basic, Admin & Superadmin
reportRouter.post('/new-report', VerifyJWT(), CreateReport);

//Basic, Admin & Superadmin
reportRouter.get('/read-report/:id',  VerifyJWT(), SearchReportById);

//Admin & Superadmin
reportRouter.get('/all-reports',  VerifyJWT(2), SearchReports);

//Basic, Admin & Superadmin
reportRouter.get('/user-reports/:userId',  VerifyJWT(),  SearchReportsCreatedUser);

//Admin & Superadmin
reportRouter.get('/assigned-reports/:userId',  VerifyJWT(2), SearchReportsCreatedUser);

//Admin & Superadmin
reportRouter.patch('/set-status/:reportId',  VerifyJWT(2), SetReportStatus);

//Admin & Superadmin
reportRouter.patch('/set-due/:reportId',  VerifyJWT(2), SetDueDate);

//Admin & Superadmin
reportRouter.patch('/set-priority/:reportId',  VerifyJWT(2), setPriority);

//Superadmin   
reportRouter.delete('/delete-report/:reportId',  VerifyJWT(1), deleteReport)