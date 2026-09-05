const pool = require("../config/db");

// PUBLIC: чи увімкнений каталог
exports.getCatalogStatus = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT catalog_enabled FROM site_settings WHERE id = 1"
        );
        const catalogEnabled = result.rows.length > 0
            ? result.rows[0].catalog_enabled
            : true; // безпечний дефолт, якщо рядок ще не засіяний

        return res.status(200).json({ success: true, catalogEnabled });
    } catch (error) {
        console.error("Помилка отримання статусу каталогу:", error.message);
        return res.status(500).json({
            success: false,
            message: "Помилка сервера при перевірці статусу каталогу"
        });
    }
};

// ADMIN: увімкнути/вимкнути каталог
exports.updateCatalogStatus = async (req, res) => {
    const { catalog_enabled } = req.body;

    if (typeof catalog_enabled !== "boolean") {
        return res.status(400).json({
            success: false,
            message: "Поле catalog_enabled має бути true або false"
        });
    }

    try {
        const result = await pool.query(
            `UPDATE site_settings SET catalog_enabled = $1 WHERE id = 1 RETURNING catalog_enabled;`,
            [catalog_enabled]
        );

        if (result.rows.length === 0) {
            const inserted = await pool.query(
                `INSERT INTO site_settings (id, catalog_enabled) VALUES (1, $1) RETURNING catalog_enabled;`,
                [catalog_enabled]
            );
            return res.status(200).json({ success: true, catalogEnabled: inserted.rows[0].catalog_enabled });
        }

        return res.status(200).json({ success: true, catalogEnabled: result.rows[0].catalog_enabled });
    } catch (error) {
        console.error("Помилка оновлення статусу каталогу:", error.message);
        return res.status(500).json({
            success: false,
            message: "Помилка сервера при оновленні статусу каталогу"
        });
    }
};