import { NotificationType } from '@dis/model/userNotificationModel.js';
export interface CreateNotificationParams {
    requestDescription?: string | null;
    notificationType: NotificationType | 'Request' | 'Report' | 'item';
    fk_trigger: number;
    fk_user_trigger?: number | null;
    fk_notified: number;
}
export declare const createUserNotification: (params: CreateNotificationParams) => Promise<import("sequelize").Model<any, any> | null>;
export declare const createBulkUserNotifications: (userIds: number[], params: Omit<CreateNotificationParams, 'fk_notified'>) => Promise<(import("sequelize").Model<any, any> | null)[]>;
export declare const notifyUsersByRole: (roles: number | number[], // Ej: 2 for Admin, or [1, 2] for SuperAdmin y Admin
params: Omit<CreateNotificationParams, 'fk_notified'>) => Promise<(import("sequelize").Model<any, any> | null)[]>;
//# sourceMappingURL=notificationHelper.d.ts.map