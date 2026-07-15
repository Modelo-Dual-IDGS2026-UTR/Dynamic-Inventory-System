import { Sequelize } from "sequelize";

const dbName=process.env.MYSQL_DATABASE||"DISNUTZTEST01";
const dbUser=process.env.MYSQL_USER||"user_app";
const dbPassword=process.env.MYSQL_PASSWORD||"secure_password";
const dbRootPassword=process.env.MYSQL_ROOT_PASSWORD||"root_password_super_secret";

export const mySequelize=new Sequelize(dbName,dbUser,dbPassword,{
    //Change to db for docker
    host:"localhost",
    dialect:"mariadb",
    port:3306,

    pool:{
        max:5,
        min:0,
        acquire:30000,
        idle:10000
    },
    logging:false,
    define:{
        timestamps:false,
        underscored:false
    },
    timezone:"-06:00"
});

(async ()=>{
        try{
        await mySequelize.authenticate();
        console.log("You connected")
    }catch(e){
        console.error("Your error dude: "+e);
    }
})();