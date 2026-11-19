import { mySequelize } from '@dis/db/dbConection.js';
import { DataTypes } from 'sequelize';

export enum ReportReviewStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

export const ReportResolutionReview = mySequelize.define('ReportResolutionReview', {
    reviewId: {
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
    fk_user_requested: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'User',
            key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    fk_user_reviewed: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'User',
            key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
    },
    reviewStatus: {
        type: DataTypes.ENUM(...Object.values(ReportReviewStatus)),
        allowNull: false,
        defaultValue: ReportReviewStatus.PENDING
    },
    requestNote: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    reviewNote: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE
    },
    updatedAt: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'ReportResolutionReview',
    timestamps: true
});

