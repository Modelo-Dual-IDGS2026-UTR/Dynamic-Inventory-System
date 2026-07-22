import {mySequelize} from '@dis/db/dbConection.js'
import {DataTypes} from 'sequelize';

const TestUser = mySequelize.define("TestUser",{
    id:{
        type: DataTypes.INTEGER
    },
},
{
    timestamps:true
}
    
)