const razorpay = require('razorpay');
const {RAZORPAY_API_KEY, RAZORPAY_API_SECRET} = require("./index");


const createRazorpayInstance = ()=>{
    return new razorpay({
        key_id: RAZORPAY_API_KEY,
        key_secret: RAZORPAY_API_SECRET
    });     
}


module.exports = createRazorpayInstance;
