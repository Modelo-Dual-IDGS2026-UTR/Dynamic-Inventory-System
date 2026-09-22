import {mySequelize} from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

export const UserSession = mySequelize.define('UserSession', {
    sessionId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    refreshTokenHash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    revokedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'UserSession',
    timestamps: true
});