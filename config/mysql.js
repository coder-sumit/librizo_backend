const {MySql_USER, MySql_PASS, MySql_DB_NAME} = require("./index");

module.exports = {
    mysqlDB: {
        host: 'localhost',
        user: MySql_USER,       
        password: MySql_PASS,       
        database: MySql_DB_NAME,  
        connectionLimit: 10  
    }
}