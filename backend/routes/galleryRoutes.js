const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/authSecurity");
const noStoreCache = require("../middleware/noStoreCache");
const {
    getGalleryPhotos,
    getGalleryPhotoFile,
    createGalleryPhoto,
    deleteGalleryPhoto
} = require("../controllers/galleryController");

const rawImageUpload = express.raw({
    type: ["image/jpeg", "image/png", "image/webp"],
    limit: "8mb"
});

router.get("/", getGalleryPhotos);
router.get("/:id/file", getGalleryPhotoFile);
router.post("/", adminAuth, rawImageUpload, createGalleryPhoto);
router.delete("/:id", adminAuth, noStoreCache, deleteGalleryPhoto);

module.exports = router;
