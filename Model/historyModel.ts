import { mySequelize } from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

export const History = mySequelize.define("History", {
    historyId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    historyDescription: {
        type: DataTypes.STRING,
        allowNull: false
    },
    actionType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fk_user: {
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
    fk_place: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Place',
            key: 'placeId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    fk_report: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Report',
            key: 'reportId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    createdAt: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'History',
    timestamps: true,
    updatedAt: false
})
