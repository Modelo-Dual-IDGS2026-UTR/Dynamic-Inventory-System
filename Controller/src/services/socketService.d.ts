import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'node:http';
export declare const initSocketServer: (httpServer: HTTPServer) => SocketIOServer;
export declare const getIO: () => SocketIOServer;
export interface NotificationPayload {
    actionType: string;
    description: string;
    userId: number;
    itemId?: number | null;
    placeId?: number | null;
    reportId?: number | null;
    requestId?: number | null;
    timestamp: Date | string;
    [key: string]: unknown;
}
export declare const emitNotification: (event: string, data: NotificationPayload | Record<string, unknown>, room?: string) => void;
//# sourceMappingURL=socketService.d.ts.map