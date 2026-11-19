import { mySequelize } from '@dis/db/dbConection.js';

// 2. Importas todos tus modelos ya definidos
import { User } from './userModel.js';
import { UserRole } from './roleModel.js';
import { Item, ItemStatus } from './itemModel.js';
import { Place } from './placeModel.js';
import { Permission } from './permissionModel.js';
import { RolePermission } from './rolePermissionModel.js';
import { Report } from './reportModel.js';
import { History } from './historyModel.js';
import { Request } from './requestModel.js';
import { UserNotification } from './userNotificationModel.js';
import { UserSession } from './userSessionModel.js';
import { Category } from './categoryModel.js';
import { Employee } from './employeeModel.js';
import { ReportResolutionReview, ReportReviewStatus } from './reportResolutionReviewModel.js';
import { ReportComment } from './reportCommentModel.js';
import { ReportCommentEdit } from './reportCommentEditModel.js';

const setupAssociations = () => {
    //######User-Role################
    UserRole.hasMany(User, {
        foreignKey: 'fk_role',
        sourceKey: 'roleId',
        as: 'related_users'
    });
    User.belongsTo(UserRole, {
        foreignKey: 'fk_role',
        targetKey: 'roleId',
        as: 'related_role'
    });

    //######User-Session################
    User.hasMany(UserSession, {
        foreignKey: 'userId',
        as: 'sessions'
    });

    UserSession.belongsTo(User, {
        foreignKey: 'userId',
        as: 'user'
    });
    //######Place-Item################
    Place.hasMany(Item, {
        foreignKey: 'fk_place',
        sourceKey: 'placeId',
        as: 'related_item'
    });
    Item.belongsTo(Place, {
        foreignKey: 'fk_place',
        targetKey: 'placeId',
        as: 'related_place'
    });
    //######Employee-Item################
    Employee.hasMany(Item, {
        foreignKey: 'fk_user_responsible',
        sourceKey: 'employeeId',
        as: 'related_item'
    });
    Item.belongsTo(Employee, {
        foreignKey: 'fk_user_responsible',
        targetKey: 'employeeId',
        as: 'responsible_user'
    });
    //######Category-Item################
    Category.hasMany(Item, {
        foreignKey: 'fk_category',
        sourceKey: 'categoryId',
        as: 'related_item'
    });
    Item.belongsTo(Category, {
        foreignKey: 'fk_category',
        targetKey: 'categoryId',
        as: 'category'
    })
    //######Employee-User################
    Employee.hasMany(User, {
        foreignKey: 'employeeId',
        sourceKey: 'employeeId',
        as: 'user_accounts'
    });
    User.belongsTo(Employee, {
        foreignKey: 'employeeId',
        targetKey: 'employeeId',
        as: 'employee'
    });
    //######Role-Permission################
    UserRole.hasMany(RolePermission, {
        foreignKey: 'fk_role',
        sourceKey: 'roleId',
        as: 'role_permissions'
    });
    RolePermission.belongsTo(UserRole, {
        foreignKey: 'fk_role',
        targetKey: 'roleId',
        as: 'related_role'
    });
    Permission.hasMany(RolePermission, {
        foreignKey: 'fk_permission',
        sourceKey: 'permissionId',
        as: 'role_permissions'
    });
    RolePermission.belongsTo(Permission, {
        foreignKey: 'fk_permission',
        targetKey: 'permissionId',
        as: 'related_permission'
    });
    //######Report################
    User.hasMany(Report, {
        foreignKey: 'fk_user_creator',
        sourceKey: 'userId',
        as: 'user_created_reports'
    });
    Report.belongsTo(User, {
        foreignKey: 'fk_user_creator',
        targetKey: 'userId',
        as: 'related_user_creator'
    });
    User.hasMany(Report, {
        foreignKey: 'fk_user_assigned',
        sourceKey: 'userId',
        as: 'user_assigned_reports'
    });
    Report.belongsTo(User, {
        foreignKey: 'fk_user_assigned',
        targetKey: 'userId',
        as: 'related_user_assigned'
    });
    Place.hasMany(Report, {
        foreignKey: 'fk_place',
        sourceKey: 'placeId',
        as: 'place_reports'
    });
    Report.belongsTo(Place, {
        foreignKey: 'fk_place',
        targetKey: 'placeId',
        as: 'related_place'
    });
    Item.hasMany(Report, {
        foreignKey: 'fk_item',
        sourceKey: 'itemId',
        as: 'item_reports'
    });
    Report.belongsTo(Item, {
        foreignKey: 'fk_item',
        targetKey: 'itemId',
        as: 'related_item'
    });
    //######History################
    User.hasMany(History, {
        foreignKey: 'fk_user',
        sourceKey: 'userId',
        as: 'user_histories'
    });
    History.belongsTo(User, {
        foreignKey: 'fk_user',
        targetKey: 'userId',
        as: 'related_user'
    });
    Item.hasMany(History, {
        foreignKey: 'fk_item',
        sourceKey: 'itemId',
        as: 'item_histories'
    });
    History.belongsTo(Item, {
        foreignKey: 'fk_item',
        targetKey: 'itemId',
        as: 'related_item'
    });
    Place.hasMany(History, {
        foreignKey: 'fk_place',
        sourceKey: 'placeId',
        as: 'place_histories'
    });
    History.belongsTo(Place, {
        foreignKey: 'fk_place',
        targetKey: 'placeId',
        as: 'related_place'
    });
    Report.hasMany(History, {
        foreignKey: 'fk_report',
        sourceKey: 'reportId',
        as: 'report_histories'
    });
    History.belongsTo(Report, {
        foreignKey: 'fk_report',
        targetKey: 'reportId',
        as: 'related_report'
    });
    Request.hasMany(History, {
        foreignKey: 'fk_request',
        sourceKey: 'requestId',
        as: 'request_histories'
    });
    History.belongsTo(Request, {
        foreignKey: 'fk_request',
        targetKey: 'requestId',
        as: 'related_request'
    });
    //######Request################
    User.hasMany(Request, {
        foreignKey: 'fk_user_reciver',
        sourceKey: 'userId',
        as: 'received_requests'
    });
    Request.belongsTo(User, {
        foreignKey: 'fk_user_reciver',
        targetKey: 'userId',
        as: 'receiver'
    });
    User.hasMany(Request, {
        foreignKey: 'fk_user_requester',
        sourceKey: 'userId',
        as: 'sent_requests'
    });
    Request.belongsTo(User, {
        foreignKey: 'fk_user_requester',
        targetKey: 'userId',
        as: 'requester'
    });
    Item.hasMany(Request, {
        foreignKey: 'fk_item',
        sourceKey: 'itemId',
        as: 'item_requests'
    });
    Request.belongsTo(Item, {
        foreignKey: 'fk_item',
        targetKey: 'itemId',
        as: 'related_item'
    });
    //######UserNotification################
    User.hasMany(UserNotification, {
        foreignKey: 'fk_user_trigger',
        sourceKey: 'userId',
        as: 'triggered_notifications'
    });
    UserNotification.belongsTo(User, {
        foreignKey: 'fk_user_trigger',
        targetKey: 'userId',
        as: 'triggerer'
    });
    User.hasMany(UserNotification, {
        foreignKey: 'fk_notified',
        sourceKey: 'userId',
        as: 'received_notifications'
    });
    UserNotification.belongsTo(User, {
        foreignKey: 'fk_notified',
        targetKey: 'userId',
        as: 'notified_user'
    });
    //######ReportResolutionReview################
    Report.hasMany(ReportResolutionReview, {
        foreignKey: 'fk_report',
        sourceKey: 'reportId',
        as: 'resolution_reviews'
    });
    ReportResolutionReview.belongsTo(Report, {
        foreignKey: 'fk_report',
        targetKey: 'reportId',
        as: 'related_report'
    });
    User.hasMany(ReportResolutionReview, {
        foreignKey: 'fk_user_requested',
        sourceKey: 'userId',
        as: 'requested_report_reviews'
    });
    ReportResolutionReview.belongsTo(User, {
        foreignKey: 'fk_user_requested',
        targetKey: 'userId',
        as: 'requester'
    });
    User.hasMany(ReportResolutionReview, {
        foreignKey: 'fk_user_reviewed',
        sourceKey: 'userId',
        as: 'reviewed_report_reviews'
    });
    ReportResolutionReview.belongsTo(User, {
        foreignKey: 'fk_user_reviewed',
        targetKey: 'userId',
        as: 'reviewer'
    });
    //######ReportComment & ReportCommentEdit################
    Report.hasMany(ReportComment, {
        foreignKey: 'fk_report',
        sourceKey: 'reportId',
        as: 'comments'
    });
    ReportComment.belongsTo(Report, {
        foreignKey: 'fk_report',
        targetKey: 'reportId',
        as: 'related_report'
    });
    User.hasMany(ReportComment, {
        foreignKey: 'fk_user_author',
        sourceKey: 'userId',
        as: 'report_comments'
    });
    ReportComment.belongsTo(User, {
        foreignKey: 'fk_user_author',
        targetKey: 'userId',
        as: 'author'
    });
    ReportComment.hasMany(ReportCommentEdit, {
        foreignKey: 'fk_comment',
        sourceKey: 'commentId',
        as: 'edit_history'
    });
    ReportCommentEdit.belongsTo(ReportComment, {
        foreignKey: 'fk_comment',
        targetKey: 'commentId',
        as: 'comment'
    });
    User.hasMany(ReportCommentEdit, {
        foreignKey: 'fk_user_editor',
        sourceKey: 'userId',
        as: 'report_comment_edits'
    });
    ReportCommentEdit.belongsTo(User, {
        foreignKey: 'fk_user_editor',
        targetKey: 'userId',
        as: 'editor'
    });
}

setupAssociations();

export {
    User,
    UserRole,
    Item,
    ItemStatus,
    Place,
    Permission,
    RolePermission,
    Report,
    History,
    Request,
    UserNotification,
    UserSession,
    Category,
    Employee,
    ReportResolutionReview,
    ReportReviewStatus,
    ReportComment,
    ReportCommentEdit
}
