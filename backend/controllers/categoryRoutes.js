const express = require("express");
const router = express.Router();
const {
    getAllCategories,
    getAllCategoriesAdmin,
    createCategory,
    updateCategory,
    deleteCategory
} = require("../controllers/categoryController");

const adminAuth = require("../middleware/authSecurity");

// Публічний — каталог категорій з вкладеними товарами
router.get("/", getAllCategories);

// Адмін — повний список, включно з неактивними
router.get("/admin", adminAuth, getAllCategoriesAdmin);

router.post("/", adminAuth, createCategory);
router.put("/:id", adminAuth, updateCategory);
router.delete("/:id", adminAuth, deleteCategory);

module.exports = router;
