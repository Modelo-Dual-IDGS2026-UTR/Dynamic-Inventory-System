import type { Response, Request } from 'express';
declare const CreateItem: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchItemById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const SearchItems: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const UpdateItem: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
declare const DeleteItemByID: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const itemController: {
    CreateItem: typeof CreateItem;
    SearchItemById: typeof SearchItemById;
    SearchItems: typeof SearchItems;
    UpdateItem: typeof UpdateItem;
    DeleteItemByID: typeof DeleteItemByID;
};
export {};
//# sourceMappingURL=itemController.d.ts.map