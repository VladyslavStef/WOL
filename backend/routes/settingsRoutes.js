const express = require("express");
const router = express.Router();
const { getCatalogStatus, updateCatalogStatus } = require("../controllers/settingsController");
const adminAuth = require("../middleware/authSecurity");

router.get("/catalog-status", getCatalogStatus);          // публічно — фронтенд читає стан
router.put("/catalog-status", adminAuth, updateCatalogStatus); // лише адмін

module.exports = router;