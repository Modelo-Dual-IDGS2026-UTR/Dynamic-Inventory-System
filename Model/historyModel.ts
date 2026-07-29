import { mySequelize } from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

export const History = mySequelize.define("History", {
    historyId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    fk_user: {
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
    fk_place: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Place',
            key: 'placeId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    fk_report: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Report',
            key: 'reportId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    createdAt: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'History',
    timestamps: true,
    updatedAt: false
})
