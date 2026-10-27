const path = require("path");
const pool = require("../config/db");

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
]);

const publicPhoto = function (row) {
    return {
        id: Number(row.id),
        fileName: row.file_name,
        imageUrl: row.source_url || `/gallery/${row.id}/file`,
        sortOrder: Number(row.sort_order),
        createdAt: row.created_at
    };
};

// PUBLIC: only metadata and image URLs. The binary data stays out of this
// response so the page can load the gallery progressively.
exports.getGalleryPhotos = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, file_name, source_url, sort_order, created_at
            FROM gallery_photos
            ORDER BY sort_order ASC, id ASC
        `);

        return res.json({
            success: true,
            data: result.rows.map(publicPhoto)
        });
    } catch (error) {
        console.error("Помилка отримання фото галереї:", error.message);
        return res.status(500).json({
            success: false,
            message: "Не вдалося завантажити галерею"
        });
    }
};

// PUBLIC: returns the actual uploaded image. Seed photos use source_url and
// therefore never reach this route.
exports.getGalleryPhotoFile = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT file_name, mime_type, image_data
            FROM gallery_photos
            WHERE id = $1
        `, [req.params.id]);

        const photo = result.rows[0];

        if (!photo || !photo.image_data) {
            return res.status(404).json({
                success: false,
                message: "Фото не знайдено"
            });
        }

        res.set({
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": `inline; filename="${photo.file_name}"`,
            "X-Content-Type-Options": "nosniff"
        });
        return res.type(photo.mime_type).send(photo.image_data);
    } catch (error) {
        console.error("Помилка отримання файлу галереї:", error.message);
        return res.status(500).json({
            success: false,
            message: "Не вдалося відкрити фото"
        });
    }
};

// ADMIN: accepts a raw JPEG, PNG or WebP file. Binary data is kept in
// PostgreSQL, so it survives Render redeployments and restarts.
exports.createGalleryPhoto = async (req, res) => {
    const mimeType = String(req.headers["content-type"] || "")
        .split(";")[0]
        .trim()
        .toLowerCase();

    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
        return res.status(400).json({
            success: false,
            message: "Оберіть зображення у форматі JPG, PNG або WebP"
        });
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Файл зображення не отримано"
        });
    }

    if (req.body.length > MAX_IMAGE_BYTES) {
        return res.status(400).json({
            success: false,
            message: "Фото завелике. Оберіть файл до 8 МБ"
        });
    }

    const headerFileName = decodeURIComponent(
        String(req.headers["x-file-name"] || "gallery-photo")
    );
    const safeFileName = path.basename(headerFileName)
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 120) || "gallery-photo";

    try {
        const result = await pool.query(`
            INSERT INTO gallery_photos (
                file_name,
                mime_type,
                image_data,
                source_url,
                sort_order,
                created_by_admin_id
            )
            VALUES (
                $1,
                $2,
                $3,
                NULL,
                COALESCE((SELECT MAX(sort_order) + 1 FROM gallery_photos), 0),
                $4
            )
            RETURNING id, file_name, source_url, sort_order, created_at
        `, [safeFileName, mimeType, req.body, req.admin.id]);

        return res.status(201).json({
            success: true,
            message: "Фото додано до галереї",
            data: publicPhoto(result.rows[0])
        });
    } catch (error) {
        console.error("Помилка додавання фото галереї:", error.message);
        return res.status(500).json({
            success: false,
            message: "Не вдалося зберегти фото"
        });
    }
};

// ADMIN: deleting a row also deletes the binary photo from PostgreSQL.
exports.deleteGalleryPhoto = async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM gallery_photos WHERE id = $1 RETURNING id",
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Фото вже видалене або не знайдене"
            });
        }

        return res.json({
            success: true,
            message: "Фото видалено з галереї"
        });
    } catch (error) {
        console.error("Помилка видалення фото галереї:", error.message);
        return res.status(500).json({
            success: false,
            message: "Не вдалося видалити фото"
        });
    }
};
