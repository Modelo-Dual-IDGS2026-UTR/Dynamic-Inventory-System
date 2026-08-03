import { mySequelize } from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

export enum NotificationType {
    REQUEST = "Request",
    REPORT = "Report",
    ITEM = "item"
}

export const UserNotification = mySequelize.define("UserNotification", {
    notificationId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    requestDescription: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    notificationType: {
        type: DataTypes.ENUM(...Object.values(NotificationType)),
        defaultValue: NotificationType.ITEM
    },
    fk_trigger: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fk_user_trigger: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    fk_notified: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    createdAt: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'UserNotification',
    timestamps: true,
    updatedAt: false
})
