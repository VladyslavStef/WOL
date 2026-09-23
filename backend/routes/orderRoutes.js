const express = require("express");
const router = express.Router();


const { createOrder, getAllOrders, updateOrderStatus } = require("../controllers/orderController");

// Імпортуємо файл-охоронець з папки middleware (authSecurity.js)
const adminAuth = require("../middleware/authSecurity");

// (SECURITY — spam protection): без ліміту сторонній сайт/скрипт
// міг би масово тригерити фейкові замовлення (і тим самим — списання
// stock) з браузерів відвідувачів.
const { createRateLimiter } = require("../middleware/rateLimit");
const noStoreCache = require("../middleware/noStoreCache");

const orderRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Забагато спроб оформити замовлення. Спробуйте трохи пізніше.",
});

// 1. Маршрут для клієнта: оформлення замовлення (відкритий для всіх покупців)
router.post("/", orderRateLimit, createOrder);

// 2. Маршрути для адміна: перегляд та зміна статусів (захищені за допомогою adminAuth)
//(SECURITY): no-store — список замовлень містить ПІБ/телефони
// клієнтів, не повинен кешуватись браузером/проксі.
router.get("/admin", adminAuth, noStoreCache, getAllOrders);
router.put("/admin/:id", adminAuth, updateOrderStatus);

module.exports = router;