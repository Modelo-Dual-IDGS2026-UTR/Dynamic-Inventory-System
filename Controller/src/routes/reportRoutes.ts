import express from 'express';
import { VerifyJWT } from '../middleware/jwtUtils.js';
import {
    CreateReport,
    SearchReportById,
    SearchReports,
    SearchReportsCreatedUser,
    SetReportStatus,
    SetDueDate,
    setPriority,
    deleteReport,
} from '../controllers/reportController.js';

export const reportRouter = express.Router();

reportRouter.post('/new-report', VerifyJWT(), CreateReport);
reportRouter.get('/read-report/:id', VerifyJWT(), SearchReportById);
reportRouter.get('/all-reports', VerifyJWT(2), SearchReports);
reportRouter.get('/user-reports/:userId', VerifyJWT(), SearchReportsCreatedUser);
reportRouter.get('/assigned-reports/:userId', VerifyJWT(2), SearchReportsCreatedUser);
reportRouter.patch('/set-status/:reportId', VerifyJWT(2), SetReportStatus);
reportRouter.patch('/set-due/:reportId', VerifyJWT(2), SetDueDate);
reportRouter.patch('/set-priority/:reportId', VerifyJWT(2), setPriority);
reportRouter.delete('/delete-report/:reportId', VerifyJWT(1), deleteReport);
