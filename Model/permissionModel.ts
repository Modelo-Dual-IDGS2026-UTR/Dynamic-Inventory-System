import { mySequelize } from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

export const Permission = mySequelize.define("Permission", {
    permissionId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    permissionName: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    permissionDescription: {
        type: DataTypes.STRING(255),
        allowNull: false
    }
}, {
    tableName: 'Permission',
    timestamps: false
})
