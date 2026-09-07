import { reportController } from "../controllers/reportController.js";
import  express  from "express";
export const reportRouter=express.Router();

//Remember to implement JWT to protect the routes

reportRouter.post('/new-report',reportController.CreateReport);

reportRouter.get('/read-report/:id', reportController.SearchReportById);

reportRouter.get('/all-reports',reportController.SearchReports);

reportRouter.get('/user-reports/:userId',reportController.SearchReportsCreatedUser);

//This one must have a middleware that verifies the role of the user
//reportRouter.get('/assigned-reports/:userId',reportController.SearchReportsCreatedUser);