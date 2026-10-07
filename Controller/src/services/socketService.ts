import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'node:http';

//Saves the instance of the global server
let io: SocketIOServer | null = null;

//Rceives the native server from index.ts in the parameters
export const initSocketServer = (httpServer: HTTPServer): SocketIOServer => {
    io = new SocketIOServer(httpServer, {
        
        // It gives permission to the frontend to conect y and share cookies/session
        cors: {
            origin: ['http://localhost:3000', 'http://localhost:5173'],
            methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {

        socket.on('join_room', (room: string) => {
            // Joins to any room 
            // Made specifcally to use it with groups
            if (typeof room === 'string' && room.trim()) {
                socket.join(room);
            }
        });

        // Identify the user in their personal room
        // When the user is the same, is like a private mailbox
        socket.on('identify', (userId: number | string) => {
            if (userId) {
                socket.join(`user_${userId}`);
            }
        });

        // Leave a room
        socket.on('leave_room', (room: string) => {
            if (typeof room === 'string' && room.trim()) {
                socket.leave(room);
            }
        });

        socket.on('disconnect', () => {
        });
    });

    return io;
};

// In case you want to access to advanced features 
export const getIO = (): SocketIOServer => {
    if (!io) {
        throw new Error('Socket.IO no ha sido inicializado. Llama a initSocketServer primero.');
    }
    return io;
};

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

// emit the notification through the web socker
export const emitNotification = (
    event: string,
    data: NotificationPayload | Record<string, unknown>,
    room?: string
): void => {
    if (!io) {
        console.warn('Socket.IO no está inicializado. No se pudo emitir:', event);
        return;
    }

    if (room) {
        io.to(room).emit(event, data); //Members of the room
    } else {
        io.emit(event, data); // All conected members
    }
};
