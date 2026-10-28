import type { UserRole } from "./UserRoleModel"

export interface User{
    "id":number,
    "firstName":string,
    "lastName":string,
    "email":string,
    "userStatus":boolean,
    "area":string,
    "fk_role":UserRole,
    "createdAt":Date,
    "updateAt":Date
    

}

