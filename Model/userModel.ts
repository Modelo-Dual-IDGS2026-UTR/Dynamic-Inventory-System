import {mySequelize} from '@dis/db/dbConection.js'
import { DataTypes } from 'sequelize'

//Im doing this while watching FNAF videos - Hi Oanimatronic, im updating this while I hear Music
export const User = mySequelize.define("User",{
    userId:{
        type: DataTypes.INTEGER,
        primaryKey:true,
        autoIncrement:true
    },
    googleUserId:{
        type:DataTypes.STRING,
        allowNull:false,
        unique:true
    },
    universityId:{
        type:DataTypes.STRING,
        unique:true
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
        allowNull:false,
        unique:true,
        validate:{
            isEmail:true
        }
    },
    area:{
        type:DataTypes.STRING
    },
    employeeId:{
        type:DataTypes.INTEGER,
        allowNull:true,
        unique:true,
        references:{
            model:'Employee',
            key:'employeeId'
        },
        onUpdate:'CASCADE',
        onDelete:'SET NULL'
    },
    fk_role:{
        type: DataTypes.INTEGER,
        allowNull:true,
        references:{
            model:'UserRole',
            key:'roleId'
        },
        onUpdate:'CASCADE',
        onDelete:'SET NULL'
    },
    createdAt:{
        type:DataTypes.DATE
    },
    updatedAt:{
        type:DataTypes.DATE
    }

},{
    tableName:'User',
timestamps:false,
validate: {
    exclusiveInstitutionalIdentity(this: any) {
        const universityId = this.getDataValue('universityId')
        const employeeId = this.getDataValue('employeeId')

        if (universityId && employeeId) {
            throw new Error('A user cannot have both universityId and employeeId')
        }
    }
}
 });
