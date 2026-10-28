import type { Response, Request } from 'express';
declare const CreatePlace: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const SearchPlacesById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const AllPlaces: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const EditPlace: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
declare const DeletePlaceByID: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export { CreatePlace, AllPlaces, SearchPlacesById, EditPlace, DeletePlaceByID };
//# sourceMappingURL=placeController.d.ts.map