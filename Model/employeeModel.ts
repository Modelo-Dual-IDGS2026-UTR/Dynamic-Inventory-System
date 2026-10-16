import { mySequelize } from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'


export const Employee = mySequelize.define("Employee",{
    employeeId:{
        type: DataTypes.INTEGER,
        primaryKey:true
    },
    firstName:{
        type: DataTypes.STRING,
        allowNull:false
    },
    lastName:{
        type: DataTypes.STRING,
        allowNull:false
    },
    //PTC - ASIGNATURA 
    employeeType: {
        type:DataTypes.STRING
    },
    email:{
        type:DataTypes.STRING,
        allowNull:false,
        unique:true
    },
    area:{
        type:DataTypes.STRING
    },
    status: {
        type:DataTypes.BOOLEAN,
        allowNull:false,
        defaultValue:true
    },
    createdAt:{
        type:DataTypes.DATE
    },
    updatedAt:{
        type:DataTypes.DATE
    }

},{
    tableName:'Employee',
    timestamps:false
});
