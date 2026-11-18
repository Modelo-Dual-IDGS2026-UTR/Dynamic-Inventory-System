import { mySequelize } from '@dis/db/dbConection.js';
import { DataTypes } from 'sequelize';

export const ReportCommentEdit = mySequelize.define('ReportCommentEdit', {
    editId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    fk_comment: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ReportComment',
            key: 'commentId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    fk_user_editor: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'User',
            key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    previousContent: {
        type: DataTypes.STRING(1000),
        allowNull: false
    },
    editedAt: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'ReportCommentEdit',
    timestamps: true,
    createdAt: 'editedAt',
    updatedAt: false
});

