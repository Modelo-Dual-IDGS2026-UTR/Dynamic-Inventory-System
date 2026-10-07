import { UserNotification } from '@dis/model';
import { NotificationType } from '@dis/model/userNotificationModel.js';
import { emitNotification } from '../services/socketService.js';
import { User } from '@dis/model';
import { Op } from 'sequelize';

export interface CreateNotificationParams {
    requestDescription?: string | null;
    notificationType: NotificationType | 'Request' | 'Report' | 'item';
    fk_trigger: number;
    fk_user_trigger?: number | null;
    fk_notified: number;
}

export const createUserNotification = async (params: CreateNotificationParams) => {
    try {
        const notification = await UserNotification.create({
            requestDescription: params.requestDescription ?? null,
            notificationType: params.notificationType,
            fk_trigger: params.fk_trigger,
            fk_user_trigger: params.fk_user_trigger ?? null,
            fk_notified: params.fk_notified,
            isRead: false
        });

        // Emitir a la sala personal del usuario notificado (ej. user_5)
        const payload = notification.toJSON();
        emitNotification('new_notification', payload, `user_${params.fk_notified}`);

        return notification;
    } catch (error) {
        console.error("Error al crear notificación para usuario:", error);
        return null;
    }
};

//Developed to send massive notifications to specified users, for example, admins
export const createBulkUserNotifications = async (
    //ID's from the users that are going to receive the notification
    userIds: number[],
    //Omit, takes all parameters from CreateNotificationParams
    //In this case the exception is fk_notified 
    params: Omit<CreateNotificationParams, 'fk_notified'>
) => {
    try {
        //Iterates each value of the array and injecting fk_notified
        const promises = userIds.map((userId) =>
            createUserNotification({
                ...params,
                fk_notified: userId
            })
        );
        //Inserts all insertions inside the BD and emits to Socket.IO
        return await Promise.all(promises);
    } catch (error) {
        console.error("Error al crear notificaciones masivas:", error);
        return [];
    }
};



export const notifyUsersByRole = async (
    roles: number | number[], // Ej: 2 for Admin, or [1, 2] for SuperAdmin y Admin
    params: Omit<CreateNotificationParams, 'fk_notified'>
) => {
    try {
        // 1. Search all users with the specified role
        const users = await User.findAll({
            where: {
                fk_role: Array.isArray(roles) ? { [Op.in]: roles } : roles,
                userStatus: true // Only active users
            },
            attributes: ['userId']
        });
        const userIds = users.map(u => (u as any).userId);
        
        // 2. Uses createBulkUserNotification to send the notifications with roles
        return await createBulkUserNotifications(userIds, params);
    } catch (error) {
        console.error("Error al notificar por rol:", error);
        return [];
    }
};
