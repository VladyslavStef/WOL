const express = require("express");
const router = express.Router();
const { getAllCategories } = require("../controllers/categoryController");

// Публічний — каталог категорій з вкладеними товарами
router.get("/", getAllCategories);

module.exports = router;
