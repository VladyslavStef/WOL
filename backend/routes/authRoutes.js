 const express = require("express");
 const router = express.Router();
 const { login } = require("../controllers/authController");
 const loginRateLimit = require("../middleware/loginRateLimit");

 router.post("/login", loginRateLimit, login);

 module.exports = router;