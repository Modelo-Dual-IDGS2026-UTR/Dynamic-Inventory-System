import {mySequelize} from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

//Im doing this while watching FNAF videos
export const User = mySequelize.define("User",{
    userId:{
        type: DataTypes.INTEGER,
        primaryKey:true,
        autoIncrement:true
    },
    firstName:{
        type: DataTypes.STRING,
        allowNull:false
    },
    lastName:{
        type: DataTypes.STRING,
        allowNull:false
    },
    userStatus:{
        type: DataTypes.BOOLEAN,
        defaultValue:true
    },
    email:{
        type:DataTypes.STRING,
        allowNull:false
    },
    area:{
        type:DataTypes.STRING,
        allowNull:false
    },
    fk_role:{
        type: DataTypes.INTEGER,
        allowNull:false,
        references:{
            model:'UserRole',
            key:'roleId'
        },
        onUpdate:'CASCADE',
        onDelete:'CASCADE'
    },
    createdAt:{
        type:DataTypes.DATE
    },
    updatedAt:{
        type:DataTypes.DATE
    }

},{
    tableName:'User',
    timestamps:false
});
