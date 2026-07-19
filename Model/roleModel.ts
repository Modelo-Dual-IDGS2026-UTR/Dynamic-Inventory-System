import {mySequelize} from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'
// har har ha har har
export const UserRole = mySequelize.define("UserRole",{
    roleId:{
        type:DataTypes.INTEGER,
        autoIncrement:true,
        primaryKey:true
    },
    roleName:{
        type:DataTypes.STRING,
        allowNull:false,
        
    },
    roleDescription:{
        type: DataTypes.STRING,
        allowNull:false
    }
},{
    tableName:'UserRole'
})