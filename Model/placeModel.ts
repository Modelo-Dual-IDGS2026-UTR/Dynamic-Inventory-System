import { mySequelize } from "@dis/db/dbConection.js";
import {DataTypes} from 'sequelize'

export const Place=mySequelize.define("Place",{
    placeId:{
        type:DataTypes.INTEGER,
        primaryKey:true,
        allowNull:false
    },
    placeName:{
        type:DataTypes.STRING,
        allowNull:false
    },
    placeDescription:{
        type:DataTypes.STRING,
        allowNull:false
    },
    class:{
        type:DataTypes.STRING,
        allowNull:false
    },
    ip_range:{
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