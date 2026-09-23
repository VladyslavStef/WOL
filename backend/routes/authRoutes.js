const express = require("express");
const router = express.Router();
const { login } = require("../controllers/authController");

const { createRateLimiter } = require("../middleware/rateLimit");

const loginRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 хвилин
    max: 10,
    message: "Забагато спроб входу. Спробуйте через 15 хвилин.",
});

router.post("/login", loginRateLimit, login);

module.exports = router;