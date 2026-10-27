const pool = require("../config/db");

const SEED_PHOTOS = [
    "/frontend/IMG/1.png",
    "/frontend/IMG/2.png",
    "/frontend/IMG/3.png",
    "/frontend/IMG/4.png",
    "/frontend/IMG/5.png",
    "/frontend/IMG/6.png",
    "/frontend/IMG/7.png",
    "/frontend/IMG/8.png",
    "/frontend/IMG/9.png"
];

// Safe to run on every server start. It upgrades an existing database without
// requiring a separate manual migration in Render.
const initialiseGallerySchema = async function () {
    const tableCheck = await pool.query(
        "SELECT to_regclass('public.gallery_photos') IS NOT NULL AS exists"
    );
    const galleryAlreadyExists = tableCheck.rows[0].exists;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS gallery_photos (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            file_name TEXT NOT NULL,
            mime_type TEXT,
            image_data BYTEA,
            source_url TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_by_admin_id BIGINT REFERENCES admin(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT chk_gallery_photo_source CHECK (
                (image_data IS NOT NULL AND mime_type IS NOT NULL AND source_url IS NULL)
                OR
                (image_data IS NULL AND mime_type IS NULL AND source_url IS NOT NULL)
            )
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_gallery_photos_sort_order
        ON gallery_photos(sort_order)
    `);

    // Add the initial photos only when creating the table for the first time.
    // A deleted image must stay deleted after a restart or a Render deploy.
    if (!galleryAlreadyExists) {
        for (const [index, photoUrl] of SEED_PHOTOS.entries()) {
            await pool.query(`
                INSERT INTO gallery_photos (file_name, source_url, sort_order)
                VALUES ($1, $2, $3)
            `, [`Фото ${index + 1}`, photoUrl, index]);
        }
    }
};

module.exports = { initialiseGallerySchema };
