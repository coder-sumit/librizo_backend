const {DEBUG_MODE} = require("../config");
const CustomErrorHandler = require("../services/CustomErrorHandler");
const errorHandler = (err, req, res, next)=>{
   let statusCode = 500;
   let data = {
    res:{
      code: statusCode,
      status: "failed"
    },
    message: "Internal server error",
    ...(DEBUG_MODE === 'true' && {orignalError: err.message})
   }


   if(err instanceof CustomErrorHandler){
      statusCode = err.status_code;
      data = {
      res:{
            code: statusCode,
            status: "failed"
         },
        message: err.message
      }
   }
   data.success = false;
   return res.status(statusCode).json(data);
}

module.exports = errorHandler;