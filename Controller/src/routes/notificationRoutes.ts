import express from 'express';
import { VerifyJWT } from '../middleware/jwtUtils.js';
import {
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from '../controllers/notificationController.js';

export const notificationRouter = express.Router();

// Todas las rutas de notificaciones requieren estar autenticado (rol 3 o superior)
notificationRouter.get('/', VerifyJWT(3), getUserNotifications);
notificationRouter.get('/unread-count', VerifyJWT(3), getUnreadCount);
notificationRouter.patch('/read/:id/', VerifyJWT(3), markAsRead);
notificationRouter.patch('/mark-all-read', VerifyJWT(3), markAllAsRead);
notificationRouter.delete('/delete-notification/:id', VerifyJWT(3), deleteNotification);
