import { mySequelize } from "@dis/db/dbConection.js";
import {DataTypes} from 'sequelize'

export const Place=mySequelize.define("Place",{
    placeId:{
        type:DataTypes.INTEGER,
        primaryKey:true,
        autoIncrement: true,
        allowNull:false
    },
    placeName:{
        type:DataTypes.STRING,
        allowNull:false,
        unique: true
    },
    placeDescription:{
        type:DataTypes.STRING,
        allowNull:false
    },
    placeClass:{
        type:DataTypes.STRING,
        allowNull:false
    },
    placeLocation:{
        type:DataTypes.STRING,
        allowNull:false
    },
    createdAt:{type:DataTypes.DATE},
    updatedAt:{type:DataTypes.DATE}

},{
    tableName:"Place"
})