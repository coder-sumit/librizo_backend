const express = require("express");
const router = express();
const {getPricingBySeatCount} = require("../../controllers/web/pricingController");

router.get("/getPricingBySeatCount/:cabin", getPricingBySeatCount);

module.exports = router;