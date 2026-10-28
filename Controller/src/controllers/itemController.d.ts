import type { Response, Request } from 'express';
declare const CreateItem: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchItemById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchItems: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const UpdateItem: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const SetStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const ChangeResponsible: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SetCategory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const DeleteItemByID: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export { CreateItem, SearchItemById, SearchItems, UpdateItem, DeleteItemByID, SetStatus, SetCategory, ChangeResponsible };
//# sourceMappingURL=itemController.d.ts.map