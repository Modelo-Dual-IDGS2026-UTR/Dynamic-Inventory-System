import type { Response, Request } from "express";
declare const CreateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const UpdateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const FullfilUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const LogUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchUserById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const WhoAmI: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
declare const ListUsers: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SetUserRole: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const userController: {
    CreateUser: typeof CreateUser;
    LogUser: typeof LogUser;
    UpdateUser: typeof UpdateUser;
    WhoAmI: typeof WhoAmI;
    SearchUserById: typeof SearchUserById;
    FullfilUser: typeof FullfilUser;
    ListUsers: typeof ListUsers;
    SetUserRole: typeof SetUserRole;
};
export {};
//# sourceMappingURL=userController.d.ts.map