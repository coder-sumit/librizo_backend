const express = require("express");
const router = express();
const {getPricingBySeatCount,  getPlanDataByIDForCheckout} = require("../../controllers/web/pricingController");

router.get("/getPricingBySeatCount/:cabin", getPricingBySeatCount);
router.get("/getPlanDataByIDForCheckout/:id",  getPlanDataByIDForCheckout);

module.exports = router;