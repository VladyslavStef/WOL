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

// FIX (SECURITY): no-store на адмінському списку категорій — для
// узгодженості з рештою admin GET-ендпоінтів.
const noStoreCache = require("../middleware/noStoreCache");

router.get("/", getAllCategories);                     // публічно — для каталогу
router.get("/admin", adminAuth, noStoreCache, getAllCategoriesAdmin); // адмінка — активні+неактивні
router.post("/", adminAuth, createCategory);
router.put("/:id", adminAuth, updateCategory);
router.delete("/:id", adminAuth, deleteCategory);

module.exports = router;