const express = require("express");
const router = express.Router();
const {
    getAllProducts,
    getAllProductsAdmin,
    createProduct,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");

const adminAuth = require("../middleware/authSecurity");

// FIX (SECURITY): no-store на адмінському списку товарів (не критично
// чутливо, як замовлення/бронювання, але містить внутрішні дані —
// stock, sku тощо — застосовано для узгодженості з orders/bookings).
const noStoreCache = require("../middleware/noStoreCache");

router.get("/", getAllProducts);
router.get("/admin", adminAuth, noStoreCache, getAllProductsAdmin); // FIX: адмінка бачить і неактивні товари

router.post("/", adminAuth, createProduct);
router.put("/:id", adminAuth, updateProduct);
router.delete("/:id", adminAuth, deleteProduct);

module.exports = router;