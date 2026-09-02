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

router.get("/", getAllProducts);
router.get("/admin", adminAuth, getAllProductsAdmin); // FIX: адмінка бачить і неактивні товари

router.post("/", adminAuth, createProduct);
router.put("/:id", adminAuth, updateProduct);
router.delete("/:id", adminAuth, deleteProduct);

module.exports = router;