import { Sequelize } from "sequelize";

const dbName=process.env.DB_NAME || process.env.MYSQL_DATABASE || "DISNUTZTEST01";
const dbUser=process.env.DB_USER || process.env.MYSQL_USER || "user_app";
const dbPassword=process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "secure_password";
const dbHost=process.env.DB_HOST || "db";
const dbPort=Number(process.env.DB_PORT || 3306);

export const mySequelize=new Sequelize(dbName,dbUser,dbPassword,{
    
    host:dbHost,
    dialect:"mariadb",
    port:dbPort,

    pool:{
        max:5,
        min:0,
        acquire:30000,
        idle:10000
    },
    logging:false,
    define:{
        freezeTableName:true,
        timestamps:false,
        underscored:false
    },
    timezone:"-06:00"
});

export const TestConection=async ()=>{
        try{
        await mySequelize.authenticate();
        console.log("You connected")
    }catch(e){
        console.error("Your error dude: "+e);
    }
};
