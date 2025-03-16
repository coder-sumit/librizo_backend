const createRazorpayInstance = require("../config/razorpay.config");
const razorpayInstance = createRazorpayInstance();
const crypto = require("crypto");
const {RAZORPAY_API_SECRET, RAZORPAY_API_KEY} = require("../config");


const createOrder = async(req, res, next)=>{
    const {product_id, amt} = req.body;

    

    // create an order
    const options = {
        amount: amt * 100,
        currency: "INR",
        receipt: "receipt_order_1"
    }

    try{
        let order = await razorpayInstance.orders.create(options);
        
        order.razorpay_api_key = RAZORPAY_API_KEY;
        order.product_id = product_id;
        order.contact = '6532781234';
        order.name = 'Test user';

        
        return res.status(200).json(order);
    }catch(err){
        return res.status(500).json({
            success: false,
            message: "Something went wrong!"
        })
    }

}

const verifyPayment = async(req, res, next)=>{
    const {order_id, payment_id, signature} = req.body;
    
    // generate hmac object
    const hmac = crypto.createHmac("sha256", RAZORPAY_API_SECRET);

    hmac.update(order_id + "|" +  payment_id);

    const generatedSignature = hmac.digest("hex");

    if(generatedSignature === signature){
        console.log("verified");
        
        return res.status(200).json({
            success: true,
            message: "Payment verified"
        });
    }else{
        console.log("not verified");
        return res.status(400).json({
            success: false,
            message: "Payment not verified"
        });
    }
}

module.exports = {createOrder, verifyPayment};

