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
        allowNull: true,
        references: {
            model: 'User',
            key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    fk_user_requester: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'User',
            key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    fk_item: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Item',
            key: 'itemId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    createdAt: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'Request',
    timestamps: true,
    updatedAt: false
})
