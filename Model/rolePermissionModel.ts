import { mySequelize } from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

export const RolePermission = mySequelize.define("RolePermission", {
    RPId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    fk_role: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'UserRole',
            key: 'roleId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    fk_permission: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Permission',
            key: 'permissionId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    }
}, {
    tableName: 'Role_Permission',
    timestamps: false
})
