import {mySequelize} from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

enum Categories{
    NOCATEGORY="No Category"
}

export const Item = mySequelize.define("Item",{
    itemId:{
        type:DataTypes.INTEGER,
        autoIncrement:true,
        primaryKey:true
    },
    itemName:{
        type:DataTypes.STRING,
        allowNull:false
    },
    itemDescription:{
        type:DataTypes.STRING,
        allowNull:false
    },
    codeBar:{type:DataTypes.STRING},
    category:{
        type:DataTypes.ENUM(...Object.values(Categories)),
        defaultValue:Categories.NOCATEGORY,

    },
    fk_user_responsible:{
        type:DataTypes.INTEGER,
        allowNull:false,
        references:{
            model:"User",
            key:"userId"
        },
        onUpdate:'CASCADE',
        onDelete:'CASCADE'

    },
    fk_place:{
        type:DataTypes.INTEGER,
        allowNull:false,
        references:{
            model:"Place",
            key:"placeId"
        },
        onUpdate:'CASCADE',
        onDelete:'CASCADE'


    },
    createdAt:{type:DataTypes.DATE},
    updatedAt:{type:DataTypes.DATE}
},{
    tableName:"Item"
})