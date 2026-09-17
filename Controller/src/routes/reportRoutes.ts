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

import  express  from "express";
export const reportRouter=express.Router();

//Remember to implement JWT to protect the routes

//Basic, Admin & Superadmin
reportRouter.post('/new-report', CreateReport);

//Basic, Admin & Superadmin
reportRouter.get('/read-report/:id', SearchReportById);

//Admin & Superadmin
reportRouter.get('/all-reports', SearchReports);

//Basic, Admin & Superadmin
reportRouter.get('/user-reports/:userId', SearchReportsCreatedUser);

//Admin & Superadmin
reportRouter.get('/assigned-reports/:userId', SearchReportsCreatedUser);

//Admin & Superadmin
reportRouter.patch('/set-status/:reportId', SetReportStatus);

//Admin & Superadmin
reportRouter.patch('/set-due/:reportId', SetDueDate);

//Admin & Superadmin
reportRouter.patch('/set-priority/:reportId', setPriority);

//Superadmin   
reportRouter.delete('/delete-report/:reportId', deleteReport)