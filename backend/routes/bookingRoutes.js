const express = require("express");
const router = express.Router();
const { createBooking, getBusyDates, getAllBookings, deleteBooking } = require("../controllers/bookingController");

// Файл-охоронець для адмін-маршрутів (той самий, що й у products/orders)
const adminAuth = require("../middleware/authSecurity");

// FIX (SECURITY — spam protection): аналогічно orderRoutes.js — без
// ліміту можливий масовий spam фейкових бронювань.
const { createRateLimiter } = require("../middleware/rateLimit");
const noStoreCache = require("../middleware/noStoreCache");

const bookingRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: "Забагато спроб бронювання. Спробуйте трохи пізніше.",
});

// Клієнт: створення бронювання (відкритий для всіх відвідувачів)
router.post("/", bookingRateLimit, createBooking);

// Клієнт: перевірка зайнятих дат для конкретного квитка (відкритий)
router.get("/busy-dates", getBusyDates);

// Адмін: перегляд усіх бронювань
// FIX (SECURITY): no-store — список бронювань містить ПІБ/телефони
// клієнтів, не повинен кешуватись браузером/проксі.
router.get("/admin", adminAuth, noStoreCache, getAllBookings);

// Адмін: видалення бронювання (напр. тестових записів)
router.delete("/admin/:id", adminAuth, deleteBooking);

module.exports = router;