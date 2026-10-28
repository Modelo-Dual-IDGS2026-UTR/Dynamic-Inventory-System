import type { Request, Response } from "express";
declare const importEmployees: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const ShowAllEmployees: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchEmployeeById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const CreateEmployee: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const UpdateEmployee: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const changeEmployeeStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const deleteEmployee: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export { importEmployees, ShowAllEmployees, CreateEmployee, SearchEmployeeById, UpdateEmployee, changeEmployeeStatus, deleteEmployee };
//# sourceMappingURL=employeeController.d.ts.map