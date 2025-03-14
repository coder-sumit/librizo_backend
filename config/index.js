const dotenv = require("dotenv");

dotenv.config();

const {APP_PORT, MySql_USER, MySql_PASS, MySql_DB_NAME} = process.env;

module.exports = {APP_PORT, MySql_USER, MySql_PASS, MySql_DB_NAME};