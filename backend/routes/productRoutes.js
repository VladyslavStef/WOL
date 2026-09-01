const express = require("express");
const router = express.Router();
const {
    getAllProducts,
    getAllProductsAdmin, // FIX: новий контролер для адмінського списку
    createProduct,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");

const adminAuth = require("../middleware/authSecurity");

// Клієнтська вітрина — лише активні товари, без авторизації
router.get("/", getAllProducts);

// FIX: новий маршрут для адмінки — повертає ВСІ товари, включно з неактивними
router.get("/admin", adminAuth, getAllProductsAdmin);

router.post("/", adminAuth, createProduct);
router.put("/:id", adminAuth, updateProduct);
router.delete("/:id", adminAuth, deleteProduct);

module.exports = router;