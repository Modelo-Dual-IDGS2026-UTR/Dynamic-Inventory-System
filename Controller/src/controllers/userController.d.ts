import type { Response, Request } from "express";
declare const CreateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const UpdateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const FullfilUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const LogUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const RefreshToken: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const Logout: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchUserById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const WhoAmI: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
declare const ShowAllUsers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const changeStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const promotion: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const deleteUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export { CreateUser, LogUser, UpdateUser, WhoAmI, SearchUserById, FullfilUser, ShowAllUsers, changeStatus, promotion, deleteUser, RefreshToken, Logout };
//# sourceMappingURL=userController.d.ts.map