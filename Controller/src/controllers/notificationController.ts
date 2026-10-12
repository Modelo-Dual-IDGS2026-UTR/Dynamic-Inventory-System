import { UserNotification, User } from '@dis/model';
import type { Request, Response } from 'express';

//Endpoint for obtaining al notifications related to an user
export const getUserNotifications = async (req: Request, res: Response) => {
    try {
        const userId = res.locals.jwtPayloadContent?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        //Pagination - Limit equal to the assigned on the query, starts at 1 and
        //Maximum values per page is 100
        const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
        //At which position it must start looking
        const offset = Math.max(Number(req.query.offset) || 0, 0);
        //If the frontend sends it as true then it will turn true 
        const unreadOnly = req.query.unreadOnly === 'true';

        const whereCondition: Record<string, unknown> = {
            fk_notified: userId
        };

        if (unreadOnly) {
            whereCondition.isRead = false;
        }

        const { count, rows } = await UserNotification.findAndCountAll({
            where: whereCondition,
            order: [['createdAt', 'DESC']],
            limit,
            offset,
            include: [
                {
                    model: User,
                    as: 'triggerer',
                    attributes: ['userId', 'firstName', 'lastName', 'email']
                }
            ]
        });

        const unreadCount = await UserNotification.count({
            where: {
                fk_notified: userId,
                isRead: false
            }
        });

        return res.status(200).json({
            total: count,
            unreadCount,
            limit,
            offset,
            notifications: rows
        });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        return res.status(500).json({ message: 'Error interno al obtener notificaciones' });
    }
};

export const getUnreadCount = async (_req: Request, res: Response) => {
    try {
        const userId = res.locals.jwtPayloadContent?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        const count = await UserNotification.count({
            where: {
                fk_notified: userId,
                isRead: false
            }
        });

        return res.status(200).json({ unreadCount: count });
    } catch (error) {
        console.error('Error al contar notificaciones no leídas:', error);
        return res.status(500).json({ message: 'Error interno al contar notificaciones' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const userId = res.locals.jwtPayloadContent?.userId;
        const notificationId = Number(req.params.id);

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        if (!notificationId || isNaN(notificationId)) {
            return res.status(400).json({ message: 'ID de notificación inválido' });
        }

        const notification = await UserNotification.findOne({
            where: {
                notificationId,
                fk_notified: userId
            }
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notificación no encontrada' });
        }

        await notification.update({ isRead: true });

        return res.status(200).json({
            message: 'Notificación marcada como leída',
            notificationId
        });
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        return res.status(500).json({ message: 'Error interno al actualizar notificación' });
    }
};

export const markAllAsRead = async (_req: Request, res: Response) => {
    try {
        const userId = res.locals.jwtPayloadContent?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        await UserNotification.update(
            { isRead: true },
            {
                where: {
                    fk_notified: userId,
                    isRead: false
                }
            }
        );

        return res.status(200).json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        console.error('Error al marcar todas las notificaciones:', error);
        return res.status(500).json({ message: 'Error interno al actualizar notificaciones' });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const userId = res.locals.jwtPayloadContent?.userId;
        const notificationId = Number(req.params.id);

        if (!userId) {
            return res.status(401).json({ message: 'Usuario no autenticado' });
        }

        if (!notificationId || isNaN(notificationId)) {
            return res.status(400).json({ message: 'ID de notificación inválido' });
        }

        const deletedCount = await UserNotification.destroy({
            where: {
                notificationId,
                fk_notified: userId
            }
        });

        if (!deletedCount) {
            return res.status(404).json({ message: 'Notificación no encontrada' });
        }

        return res.status(200).json({ message: 'Notificación eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        return res.status(500).json({ message: 'Error interno al eliminar notificación' });
    }
};
