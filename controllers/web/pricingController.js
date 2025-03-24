const CustomErrorHandler = require("../../services/CustomErrorHandler");
const successBody = require("../../services/successBodyGenerator");
const mysql = require("mysql2/promise");
const { mysqlDB } = require("../../config/mysql");

const db = mysql.createPool(mysqlDB);

const getPricingBySeatCount = async(req, res, next)=>{
    try{
        let cabin_count = req.params.cabin;
        cabin_count = parseInt(cabin_count);
        if(isNaN(cabin_count) || cabin_count <= 0){
            return next(CustomErrorHandler.invalidInput("invalid cabin count"));
        }

        // find all distict max seat count posibile 
        let query = `SELECT DISTINCT(max_cabin_count) AS max_cabins FROM librizo_subscription_plans ORDER BY max_cabin_count`;
        let [max_cabins] = await db.query(query);
        let fitPlan = 0;

        for(let i =0; i<max_cabins.length; i++){
            if(max_cabins[i].max_cabins >= cabin_count){
                fitPlan = max_cabins[i].max_cabins;
                break;
            }
        }

        if(!fitPlan){
            return next(CustomErrorHandler.invalidInput("no available plans"));
        }

        // find pricing plans
        query = `SELECT plan_name, plan_price, max_cabin_count, max_user_count, discount, validity_days FROM librizo_subscription_plans WHERE max_cabin_count=${fitPlan} ORDER BY validity_days`;
        let [pricingPlans] = await db.query(query);

        

        


        
        return res.status(200).json(successBody("working!", pricingPlans));
        

    }catch(err){
        next(err);
    }
}

module.exports = {getPricingBySeatCount};