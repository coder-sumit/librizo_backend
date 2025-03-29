const dotenv = require("dotenv");

dotenv.config();

const {APP_PORT, MySql_USER, MySql_PASS, MySql_DB_NAME, RAZORPAY_API_KEY, 
    RAZORPAY_API_SECRET, DEBUG_MODE, GMAIL_APP_PASSWORD} = process.env;

module.exports = {APP_PORT, MySql_USER, MySql_PASS, MySql_DB_NAME, RAZORPAY_API_KEY, RAZORPAY_API_SECRET, DEBUG_MODE, GMAIL_APP_PASSWORD};