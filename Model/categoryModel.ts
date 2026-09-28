import { mySequelize } from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

export const Category = mySequelize.define('Category', {
    categoryId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    categoryName: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    categoryDescription: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    categoryStatus: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    folioNumber: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    createdAt: {
        type: DataTypes.DATE
    },
    updatedAt: {
        type: DataTypes.DATE
    }

}, {
    tableName: 'Categories',
    timeStamps: true
});