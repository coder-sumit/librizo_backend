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
        query = `SELECT plan_id, plan_name, plan_price, max_cabin_count, max_user_count, discount, validity_days FROM librizo_subscription_plans WHERE max_cabin_count=${fitPlan} ORDER BY validity_days`;
        let [pricingPlans] = await db.query(query);

        

        pricingPlans = pricingPlans.map((doc)=>{
            doc.discounted_price = parseFloat(parseFloat(doc.plan_price) * ((100 - parseFloat(doc.discount))/100)).toFixed(2);

            if(doc.validity_days < 35){
                doc.avg_monthly_cost = parseFloat(doc.discounted_price).toFixed(2);
            }else if(doc.validity_days < 100){
                doc.avg_monthly_cost = parseFloat(doc.discounted_price/3).toFixed(2);
            }
            else if(doc.validity_days < 185){
                doc.avg_monthly_cost = parseFloat(doc.discounted_price/6).toFixed(2);
            }
            else if(doc.validity_days < 370){
                doc.avg_monthly_cost = parseFloat(doc.discounted_price/12).toFixed(2);
            }
            return doc;
        });
        


        
        return res.status(200).json(successBody("Fetch Successful!", pricingPlans));
        

    }catch(err){
        next(err);
    }
}

const getPlanDataByIDForCheckout = async(req, res, next)=>{
    try{
        let plan_id = req.params.id;

        const query = `SELECT * FROM librizo_subscription_plans WHERE plan_id = ?`;

        let [planData] = await db.query(query, plan_id);

        planData= planData[0];

        let discount = parseFloat(planData?.discount);

        // write logic to check extra discount first 5 users (5%) first 15 users (2%)

       let [libraryCount] = await db.query(`SELECT COUNT(*) AS lib_count FROM library`);
        if(libraryCount[0]?.lib_count < 5){
            discount += 5;
        }else if(libraryCount[0]?.lib_count < 15){
            discount += 2;
        }
        planData.discount = discount;

        planData.discounted_price = parseFloat(parseFloat(planData.plan_price) * ((100 - parseFloat(planData.discount))/100)).toFixed(2);
        planData.discount_amt = parseFloat(planData.plan_price - planData.discounted_price).toFixed(2);


        


        return res.status(200).json(successBody("fetch successful!", planData));



    }catch(err){
        return next(err);
    }
}

module.exports = {getPricingBySeatCount,  getPlanDataByIDForCheckout};