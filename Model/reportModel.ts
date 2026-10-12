import { mySequelize } from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

export const Report = mySequelize.define("Report", {
    reportId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    reportName: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    reportDescription: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    reportStatus: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    reportPriority: {
        type: DataTypes.INTEGER,
        defaultValue: 3
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    fk_user_assigned: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'User',
            key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    fk_user_creator: {
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
    createdAt: {
        type: DataTypes.DATE
    },
    updatedAt: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'Report',
    timestamps: true
})
