const {DEBUG_MODE} = require("../config");
const CustomErrorHandler = require("../services/CustomErrorHandler");
const errorHandler = (err, req, res, next)=>{
   let statusCode = 500;
   let data = {
    message: "Internal server error",
    ...(DEBUG_MODE === 'true' && {orignalError: err.message})
   }


   if(err instanceof CustomErrorHandler){
      statusCode = err.status_code;
      data = {
        message: err.message
      }
   }
   data.success = false;
   return res.status(statusCode).json(data);
}

module.exports = errorHandler;