const express = require("express");
const router = express.Router();
const { createBooking, getBusyDates, getAllBookings, deleteBooking } = require("../controllers/bookingController");

// Файл-охоронець для адмін-маршрутів (той самий, що й у products/orders)
const adminAuth = require("../middleware/authSecurity");

// Клієнт: створення бронювання (відкритий для всіх відвідувачів)
router.post("/", createBooking);

// Клієнт: перевірка зайнятих дат для конкретного квитка (відкритий)
router.get("/busy-dates", getBusyDates);

// Адмін: перегляд усіх бронювань
router.get("/admin", adminAuth, getAllBookings);

// Адмін: видалення бронювання (напр. тестових записів)
router.delete("/admin/:id", adminAuth, deleteBooking);

module.exports = router;
