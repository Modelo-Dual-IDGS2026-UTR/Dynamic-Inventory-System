import {mySequelize} from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

export enum ItemStatus {
    IN_USE = "In Use",
    IN_STOCK = "In Stock",
    DAMAGED = "Damaged"
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
    itemStatus:{
        type: DataTypes.ENUM(...Object.values(ItemStatus)),
        defaultValue: ItemStatus.IN_STOCK
    },
    cost:{
        type:DataTypes.INTEGER,
        allowNull:false
    },
    manufacter:{
        type:DataTypes.STRING,
        allowNull:false     
    },
    codeBar:{type:DataTypes.STRING},
    fk_category:{
        type:DataTypes.INTEGER,
        allowNull:true,
        defaultValue: 1,
        references:{
            model:"Category",
            key:"categoryId"
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE"
    },
    fk_user_responsible:{
        type:DataTypes.INTEGER,
        allowNull:true,
        references:{
            model:"User",
            key:"userId"
        },
        onUpdate:'CASCADE',
        onDelete:'SET NULL'

    },
    fk_place:{
        type:DataTypes.INTEGER,
        allowNull:true,
        references:{
            model:"Place",
            key:"placeId"
        },
        onUpdate:'CASCADE',
        onDelete:'SET NULL'


    },
    createdAt:{type:DataTypes.DATE},
    updatedAt:{type:DataTypes.DATE}
},{
    tableName:"Item"
})