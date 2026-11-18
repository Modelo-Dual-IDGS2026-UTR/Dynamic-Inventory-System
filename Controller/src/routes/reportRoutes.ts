import {
    CreateReport,
    SearchReportById,
    SearchReports,
    SearchReportsCreatedUser,
    SearchReportsAssignedUser,
    SetReportStatus,
    RequestReportResolution,
    GetReportResolutionReviews,
    ReviewReportResolution,
    GetReportComments,
    CreateReportComment,
    EditReportComment,
    SetAssignedUser,
    SetDueDate,
    setPriority,
    deleteReport
} from "../controllers/reportController.js";
import { VerifyJWT } from '../middleware/jwtUtils.js';

import  express  from "express";
export const reportRouter=express.Router();

//Basic, Admin & Superadmin
reportRouter.post('/new-report', VerifyJWT(), CreateReport);

//Basic, Admin & Superadmin
reportRouter.get('/read-report/:id',  VerifyJWT(), SearchReportById);

//Admin & Superadmin
reportRouter.get('/all-reports',  VerifyJWT(2), SearchReports);

//Basic, Admin & Superadmin
reportRouter.get('/user-reports/:userId',  VerifyJWT(),  SearchReportsCreatedUser);

//Admin & Superadmin
reportRouter.get('/assigned-reports/:userId',  VerifyJWT(2), SearchReportsAssignedUser);

//Admin & Superadmin
reportRouter.patch('/set-status/:reportId',  VerifyJWT(2), SetReportStatus);

//Admin & Superadmin
reportRouter.post('/resolution-requests/:reportId', VerifyJWT(2), RequestReportResolution);

//Admin & Superadmin
reportRouter.get('/resolution-requests/:reportId', VerifyJWT(2), GetReportResolutionReviews);

//Superadmin
reportRouter.patch('/resolution-reviews/:reviewId', VerifyJWT(1), ReviewReportResolution);

//Admin & Superadmin
reportRouter.patch('/set-assigned/:reportId', VerifyJWT(1), SetAssignedUser);

//Superadmin
reportRouter.patch('/set-due/:reportId',  VerifyJWT(1), SetDueDate);

//Superadmin
reportRouter.patch('/set-priority/:reportId',  VerifyJWT(1), setPriority);

//Superadmin   
reportRouter.delete('/delete-report/:reportId',  VerifyJWT(1), deleteReport);

//Report creator, assigned employee (with employeeId), & Superadmin
reportRouter.get('/comments/:reportId', VerifyJWT(), GetReportComments);
reportRouter.post('/comments/:reportId', VerifyJWT(), CreateReportComment);
reportRouter.patch('/comments/:commentId', VerifyJWT(), EditReportComment);