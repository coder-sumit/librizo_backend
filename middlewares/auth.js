const JwtService = require("../services/JwtService");
const CustomErrorHandler = require("../services/CustomErrorHandler");

const auth = async(req, res, next)=>{
      try{
        let access_token = req.headers.authorization;
        access_token = access_token.split(" ")[1];

        if(!access_token){
          console.log("token not found!");
          
            return res.status(401).json({message: "Unauthorised!"});
        }
        
        let {id, email, role} = await JwtService.verify(access_token);
        req.user = {id, email, role};
        next();
       
      }catch(err){
        console.log("****", err);
        
        return res.status(401).json({message: "Unauthorised!"});
      }
}

module.exports = auth;