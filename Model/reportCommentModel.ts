import { mySequelize } from '@dis/db/dbConection.js';
import { DataTypes } from 'sequelize';

export const ReportComment = mySequelize.define('ReportComment', {
    commentId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
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
    fk_user_author: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'User',
            key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    content: {
        type: DataTypes.STRING(1000),
        allowNull: false
    },
    isEdited: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    createdAt: {
        type: DataTypes.DATE
    },
    updatedAt: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'ReportComment',
    timestamps: true
});

