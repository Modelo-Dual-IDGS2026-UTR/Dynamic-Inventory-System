import { mySequelize } from '@dis/db/dbConection.js';

// 2. Importas todos tus modelos ya definidos
import { User } from './userModel.js';
import { UserRole } from './roleModel.js';
import { Item } from './itemModel.js';
import { Place } from './placeModel.js';
import { Permission } from './permissionModel.js';
import { RolePermission } from './rolePermissionModel.js';
import { Report } from './reportModel.js';
import { History } from './historyModel.js';
import { Request } from './requestModel.js';
import { UserNotification } from './userNotificationModel.js';

const setupAssociations=()=>{
//######User-Role################
    UserRole.hasMany(User,{
        foreignKey: 'fk_role',
        sourceKey:'roleId',
        as: 'related_users'
    });
    User.belongsTo(UserRole,{
        foreignKey:'fk_role',
        targetKey:'roleId',
        as: 'related_role'
    });
//######Place-Item################
    Place.hasMany(Item,{
        foreignKey:'fk_place',
        sourceKey:'placeId',
        as: 'related_item'
    });
    Item.belongsTo(Place,{
        foreignKey:'fk_place',
        targetKey:'placeId',
        as: 'related_place'
    });
//######User-Item################
    User.hasMany(Item,{
        foreignKey:'fk_user_responsible',
        sourceKey: 'userId',
        as: 'related_item'
    });
    Item.belongsTo(User,{
        foreignKey:'fk_user_responsible',
        targetKey:'userId',
        as: 'responsible_user'
    });
//######Role-Permission################
    UserRole.hasMany(RolePermission,{
        foreignKey: 'fk_role',
        sourceKey: 'roleId',
        as: 'role_permissions'
    });
    RolePermission.belongsTo(UserRole,{
        foreignKey: 'fk_role',
        targetKey: 'roleId',
        as: 'related_role'
    });
    Permission.hasMany(RolePermission,{
        foreignKey: 'fk_permission',
        sourceKey: 'permissionId',
        as: 'role_permissions'
    });
    RolePermission.belongsTo(Permission,{
        foreignKey: 'fk_permission',
        targetKey: 'permissionId',
        as: 'related_permission'
    });
//######Report################
    User.hasMany(Report,{
        foreignKey: 'fk_user',
        sourceKey: 'userId',
        as: 'user_reports'
    });
    Report.belongsTo(User,{
        foreignKey: 'fk_user',
        targetKey: 'userId',
        as: 'related_user'
    });
    Place.hasMany(Report,{
        foreignKey: 'fk_place',
        sourceKey: 'placeId',
        as: 'place_reports'
    });
    Report.belongsTo(Place,{
        foreignKey: 'fk_place',
        targetKey: 'placeId',
        as: 'related_place'
    });
    Item.hasMany(Report,{
        foreignKey: 'fk_item',
        sourceKey: 'itemId',
        as: 'item_reports'
    });
    Report.belongsTo(Item,{
        foreignKey: 'fk_item',
        targetKey: 'itemId',
        as: 'related_item'
    });
//######History################
    User.hasMany(History,{
        foreignKey: 'fk_user',
        sourceKey: 'userId',
        as: 'user_histories'
    });
    History.belongsTo(User,{
        foreignKey: 'fk_user',
        targetKey: 'userId',
        as: 'related_user'
    });
    Item.hasMany(History,{
        foreignKey: 'fk_item',
        sourceKey: 'itemId',
        as: 'item_histories'
    });
    History.belongsTo(Item,{
        foreignKey: 'fk_item',
        targetKey: 'itemId',
        as: 'related_item'
    });
    Place.hasMany(History,{
        foreignKey: 'fk_place',
        sourceKey: 'placeId',
        as: 'place_histories'
    });
    History.belongsTo(Place,{
        foreignKey: 'fk_place',
        targetKey: 'placeId',
        as: 'related_place'
    });
    Report.hasMany(History,{
        foreignKey: 'fk_report',
        sourceKey: 'reportId',
        as: 'report_histories'
    });
    History.belongsTo(Report,{
        foreignKey: 'fk_report',
        targetKey: 'reportId',
        as: 'related_report'
    });
//######Request################
    User.hasMany(Request,{
        foreignKey: 'fk_user_reciver',
        sourceKey: 'userId',
        as: 'received_requests'
    });
    Request.belongsTo(User,{
        foreignKey: 'fk_user_reciver',
        targetKey: 'userId',
        as: 'receiver'
    });
    User.hasMany(Request,{
        foreignKey: 'fk_user_requester',
        sourceKey: 'userId',
        as: 'sent_requests'
    });
    Request.belongsTo(User,{
        foreignKey: 'fk_user_requester',
        targetKey: 'userId',
        as: 'requester'
    });
    Item.hasMany(Request,{
        foreignKey: 'fk_item',
        sourceKey: 'itemId',
        as: 'item_requests'
    });
    Request.belongsTo(Item,{
        foreignKey: 'fk_item',
        targetKey: 'itemId',
        as: 'related_item'
    });
//######UserNotification################
    User.hasMany(UserNotification,{
        foreignKey: 'fk_user_trigger',
        sourceKey: 'userId',
        as: 'triggered_notifications'
    });
    UserNotification.belongsTo(User,{
        foreignKey: 'fk_user_trigger',
        targetKey: 'userId',
        as: 'triggerer'
    });
    User.hasMany(UserNotification,{
        foreignKey: 'fk_notified',
        sourceKey: 'userId',
        as: 'received_notifications'
    });
    UserNotification.belongsTo(User,{
        foreignKey: 'fk_notified',
        targetKey: 'userId',
        as: 'notified_user'
    });
}

setupAssociations();

export {
    User,
    UserRole,
    Item,
    Place,
    Permission,
    RolePermission,
    Report,
    History,
    Request,
    UserNotification
}