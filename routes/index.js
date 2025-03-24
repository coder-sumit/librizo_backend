const express = require("express");
const router = express();

router.use("/web", require("./web"));

module.exports = router;