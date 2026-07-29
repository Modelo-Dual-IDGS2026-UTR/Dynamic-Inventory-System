import { mySequelize } from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

export const Request = mySequelize.define("Request", {
    requestId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    requestName: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    requestDescription: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    requestStatus: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    fk_user_reciver: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    fk_user_requester: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'User',
            key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    fk_item: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Item',
            key: 'itemId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    createdAt: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'Request',
    timestamps: true,
    updatedAt: false
})
