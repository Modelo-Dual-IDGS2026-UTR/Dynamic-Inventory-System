import type { Response, Request } from 'express';
declare const CreateReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchReportById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchReports: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchReportsCreatedUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchReportsAssignedUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SetReportStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SetAssignedUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SetDueDate: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const setPriority: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const deleteReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export { CreateReport, SearchReportById, SearchReports, SearchReportsCreatedUser, SearchReportsAssignedUser, SetReportStatus, SetAssignedUser, SetDueDate, setPriority, deleteReport };
//# sourceMappingURL=reportController.d.ts.map