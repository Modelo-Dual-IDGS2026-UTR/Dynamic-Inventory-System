import type { Request, Response } from 'express';
declare const CreateRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchUserRequests: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchReceivedRequests: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchAllRequests: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SetRequestReceiver: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const UpdatePendingRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const RequestSummary: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchRequestById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const DeleteRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const AcceptRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const RejectRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export { CreateRequest, SearchUserRequests, SearchReceivedRequests, SearchAllRequests, SetRequestReceiver, UpdatePendingRequest, RequestSummary, SearchRequestById, AcceptRequest, RejectRequest, DeleteRequest };
//# sourceMappingURL=requestController.d.ts.map