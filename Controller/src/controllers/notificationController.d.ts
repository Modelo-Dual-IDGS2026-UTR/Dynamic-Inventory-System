import type { Request, Response } from 'express';
export declare const getUserNotifications: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getUnreadCount: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markAsRead: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markAllAsRead: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteNotification: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=notificationController.d.ts.map