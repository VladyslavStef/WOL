const express = require("express");
const router = express.Router();

// Імпортуємо всі функції з контролера замовлень
const { createOrder, getAllOrders, updateOrderStatus } = require("../controllers/orderController");

// Імпортуємо файл-охоронець з папки middleware (переконайся, що він називається auth.js)
const adminAuth = require("../middleware/authSecurity");

// 1. Маршрут для клієнта: оформлення замовлення (відкритий для всіх покупців)
router.post("/", createOrder);

// 2. Маршрути для адміна: перегляд та зміна статусів (захищені за допомогою adminAuth)
router.get("/admin", adminAuth, getAllOrders);
router.put("/admin/:id", adminAuth, updateOrderStatus);

module.exports = router;
