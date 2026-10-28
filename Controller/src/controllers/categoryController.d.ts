import type { Response, Request } from 'express';
declare const CreateCategory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchCategoryById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const AllCategories: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const UpdateCategory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const DeleteCategoryByID: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export { AllCategories, SearchCategoryById, CreateCategory, UpdateCategory, DeleteCategoryByID };
//# sourceMappingURL=categoryController.d.ts.map