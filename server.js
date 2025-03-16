const express = require("express");
const app = express();
const {APP_PORT} = require("./config");
const errorHandler = require("./middlewares/ErrorHandler");
const mysql = require("mysql2");
const {mysqlDB} = require("./config/mysql");
const cors = require("cors");
const {createOrder, verifyPayment, } = require("./controllers/paymentController");



app.use(express.json());
app.use(cors());

app.get("/", (req, res)=>{
    return res.send("It's working!");
});
// app.use("/v1", require("./routes"));

app.use(errorHandler);

const mysql_db = mysql.createPool(mysqlDB);
// Handle connection failures
mysql_db.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.');
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.');
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused.');
        }
    }

    if (connection) {
        connection.release();
        console.log("MySql database connection established successfully");
    }

    return;
});

app.post("/createOrder", createOrder);
app.post("/verifyPayment", verifyPayment);


app.listen(APP_PORT, (err)=> {
    if(err){
        console.log(err);
    }
    console.log(`Yup! Server is Up and running on Port ${APP_PORT}`);
});