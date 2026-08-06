import { reportController } from "../controllers/reportController.js";
import  express  from "express";
export const reportRouter=express.Router();

reportRouter.post('/new-report',reportController.CreateReport);

reportRouter.get('/read-report/:id', reportController.SearchReportById);

reportRouter.get('/all-reports',reportController.SearchReports);

reportRouter.get('/user-reports/:userId',reportController.SearchReportsCreatedUser);