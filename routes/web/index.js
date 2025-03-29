const express = require("express");
const router = express();
const {getPricingBySeatCount,  getPlanDataByIDForCheckout} = require("../../controllers/web/pricingController");
const {createOrder, verifySubscriptionPayment} = require("../../controllers/web/paymentController");

router.get("/getPricingBySeatCount/:cabin", getPricingBySeatCount);
router.get("/getPlanDataByIDForCheckout/:id",  getPlanDataByIDForCheckout);

router.post("/createOrder", createOrder);
router.post("/verifySubscriptionPayment", verifySubscriptionPayment);

module.exports = router;