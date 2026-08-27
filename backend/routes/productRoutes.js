const express = require("express");
const router = express.Router();
const { getAllProducts, createProduct, updateProduct, deleteProduct } = require("../controllers/productController");

// Імпортуємо наш файл-охоронець з папки middleware
const adminAuth = require("../middleware/authSecurity");

// Клієнтська вітрина (Магазин): Відкритий доступ для всіх покупців (БЕЗ middleware)
router.get("/", getAllProducts);

router.post("/", adminAuth, createProduct);       // Створення нового товару
router.put("/:id", adminAuth, updateProduct);     // Редагування за його ID
router.delete("/:id", adminAuth, deleteProduct);  // Повне видалення за ID

module.exports = router;
