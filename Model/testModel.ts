import {mySequelize} from '@dis/db/dbConection.js'
import {DataTypes} from 'sequelize';

const User = mySequelize.define("User",{
    id:{
        type: DataTypes.INTEGER
    },
},
{
    timestamps:true
}
    
)