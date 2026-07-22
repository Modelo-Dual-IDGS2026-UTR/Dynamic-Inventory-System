import { mySequelize } from '@dis/db/dbConection.js';

// 2. Importas todos tus modelos ya definidos
import { User } from './userModel.js';
import { UserRole } from './roleModel.js';


const setupAssociations=()=>{
    UserRole.hasMany(User,{
        foreignKey: 'fk_role',
        sourceKey:'roleId',
        as: 'related_users'
    });
    User.belongsTo(UserRole,{
        foreignKey:'fk_role',
        targetKey:'roleId',
        as: 'related_role'
    });
}

setupAssociations();

export {
    User,
    UserRole
}