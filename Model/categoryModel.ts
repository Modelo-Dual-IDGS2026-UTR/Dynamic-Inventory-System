import { mySequelize } from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

export const Category = mySequelize.define('Category', {
    categoryId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
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
    tableName: 'Category',
    timeStamps: true
});