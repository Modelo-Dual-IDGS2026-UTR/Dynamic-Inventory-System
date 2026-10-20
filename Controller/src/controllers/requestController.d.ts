import type { Request, Response } from 'express';
declare const CreateRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const GetUserRequests: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const GetAllRequests: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const GetRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const AcceptRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const RejectRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const DeleteRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const requestController: {
    CreateRequest: typeof CreateRequest;
    GetUserRequests: typeof GetUserRequests;
    GetAllRequests: typeof GetAllRequests;
    GetRequest: typeof GetRequest;
    AcceptRequest: typeof AcceptRequest;
    RejectRequest: typeof RejectRequest;
    DeleteRequest: typeof DeleteRequest;
};
export {};
//# sourceMappingURL=requestController.d.ts.map