import { mySequelize } from '@dis/db/dbConection.js';

// 2. Importas todos tus modelos ya definidos
import { User } from './userModel.js';
import { UserRole } from './roleModel.js';
import { Item } from './itemModel.js';
import {Place} from './placeModel.js'

const setupAssociations=()=>{
//######User-Role################
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
//######Place-Item################
    Place.hasMany(Item,{
        foreignKey:'fk_place',
        sourceKey:'placeId',
        as: 'related-item'

    });
    Item.belongsTo(Place,{
        foreignKey:'fk_place',
        targetKey:'placeId',
        as: 'related-place'
    });
//######User-Item################
    User.hasMany(Item,{
        foreignKey:'fk_user_responsible',
        sourceKey: 'userId',
        as: 'related-item'
    })
    Item.belongsTo(User,{
        foreignKey:'fk_user_responsible',
        targetKey:'userId',
        as: 'respobsible-user'
    })
}

setupAssociations();

export {
    User,
    UserRole,
    Item,
    Place
}