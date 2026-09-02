const pool = require("../config/db");
const { slugify } = require("../utils/slugify");

function mapCategory(c) {
    return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        priceLabel: c.price_label,
        image: c.image_url,
        icon: c.icon_url,
        alt: c.alt,
        displayGroup: c.display_group,
        sortOrder: c.sort_order,
        isActive: c.is_active,
        products: c.products || []
    };
}

function mapProductForCategory(p) {
    return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        price: Number(p.price),
        currency: p.currency,
        image: p.image_url,
        icon: p.icon_url,
        alt: p.alt,
        categoryId: p.category_id,
        productType: p.product_type,
        pricingMode: p.pricing_mode,
        stock: p.stock,
        sortOrder: p.sort_order,
        isActive: p.is_active
    };
}

// ==========================================
// 1a. READ: публічний список категорій з вкладеними товарами
// (єдиний запит для всього каталогу — саме те, що очікує catalogue.js)
// ==========================================
exports.getAllCategories = async (req, res) => {
    try {
        const categoriesRes = await pool.query(`
            SELECT id, slug, name, description, price_label, image_url, icon_url, alt,
                   display_group, sort_order, is_active
            FROM categories
            WHERE is_active = true
            ORDER BY sort_order ASC, name ASC;
        `);
        const categories = categoriesRes.rows;

        if (categories.length > 0) {
            const categoryIds = categories.map((c) => c.id);
            const productsRes = await pool.query(`
                SELECT id, slug, title, description, price, currency, image_url, icon_url,
                       alt, category_id, product_type, pricing_mode, stock, sort_order, is_active
                FROM products
                WHERE category_id = ANY($1::bigint[]) AND is_active = true
                ORDER BY sort_order ASC, title ASC;
            `, [categoryIds]);

            const byCategoryId = {};
            for (const product of productsRes.rows) {
                if (!byCategoryId[product.category_id]) byCategoryId[product.category_id] = [];
                byCategoryId[product.category_id].push(mapProductForCategory(product));
            }
            for (const category of categories) {
                category.products = byCategoryId[category.id] || [];
            }
        }

        return res.status(200).json({ success: true, count: categories.length, data: categories.map(mapCategory) });
    } catch (error) {
        console.error("Помилка READ categories:", error.message);
        return res.status(500).json({ success: false, message: "Внутрішня помилка сервера при отриманні категорій" });
    }
};

// ==========================================
// 1b. READ: адмінський список категорій (активні + неактивні, без товарів)
// ==========================================
exports.getAllCategoriesAdmin = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, slug, name, description, price_label, image_url, icon_url, alt,
                   display_group, sort_order, is_active, created_at, updated_at
            FROM categories
            ORDER BY sort_order ASC, name ASC;
        `);
        return res.status(200).json({ success: true, count: result.rows.length, data: result.rows.map(mapCategory) });
    } catch (error) {
        console.error("Помилка READ categories (admin):", error.message);
        return res.status(500).json({ success: false, message: "Внутрішня помилка сервера при отриманні списку категорій" });
    }
};

// ==========================================
// 2. CREATE
// ==========================================
exports.createCategory = async (req, res) => {
    const { name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active } = req.body;
    const created_by_admin_id = req.admin.id;
    let { slug } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ success: false, message: "Назва категорії є обов'язковою" });
    }

    const dGroup = display_group || 'products';
    if (!['products', 'seedlings'].includes(dGroup)) {
        return res.status(400).json({ success: false, message: "Група каталогу може бути лише 'products' або 'seedlings'" });
    }

    slug = (slug && slug.trim()) ? slugify(slug) : slugify(name);
    if (!slug) slug = `category-${Date.now()}`;

    try {
        const result = await pool.query(`
            INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *;
        `, [
            slug, name.trim(), description || null, price_label || null,
            image_url || null, icon_url || null, alt || null, dGroup,
            sort_order !== undefined ? parseInt(sort_order) : 0,
            is_active !== undefined ? Boolean(is_active) : true,
            created_by_admin_id
        ]);
        return res.status(201).json({ success: true, message: "Категорію створено", data: mapCategory(result.rows[0]) });
    } catch (error) {
        console.error("Помилка CREATE category:", error.message);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: "Категорія з таким slug вже існує" });
        }
        return res.status(500).json({ success: false, message: "Помилка сервера при створенні категорії" });
    }
};

// ==========================================
// 3. UPDATE
// ==========================================
exports.updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active } = req.body;
    let { slug } = req.body;

    try {
        const checkRes = await pool.query("SELECT * FROM categories WHERE id = $1", [id]);
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Категорію не знайдено" });
        }
        const existing = checkRes.rows[0];

        if (display_group !== undefined && !['products', 'seedlings'].includes(display_group)) {
            return res.status(400).json({ success: false, message: "Група каталогу може бути лише 'products' або 'seedlings'" });
        }

        if (slug) slug = slugify(slug);
        else if (name) slug = slugify(name);
        else slug = existing.slug;

        const result = await pool.query(`
            UPDATE categories
            SET slug=$1, name=$2, description=$3, price_label=$4, image_url=$5,
                icon_url=$6, alt=$7, display_group=$8, sort_order=$9, is_active=$10
            WHERE id=$11
            RETURNING *;
        `, [
            slug,
            name !== undefined ? name.trim() : existing.name,
            description !== undefined ? description : existing.description,
            price_label !== undefined ? price_label : existing.price_label,
            image_url !== undefined ? image_url : existing.image_url,
            icon_url !== undefined ? icon_url : existing.icon_url,
            alt !== undefined ? alt : existing.alt,
            display_group !== undefined ? display_group : existing.display_group,
            sort_order !== undefined ? parseInt(sort_order) : existing.sort_order,
            is_active !== undefined ? Boolean(is_active) : existing.is_active,
            id
        ]);

        return res.status(200).json({ success: true, message: "Категорію оновлено", data: mapCategory(result.rows[0]) });
    } catch (error) {
        console.error("Помилка UPDATE category:", error.message);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: "Категорія з таким slug вже існує" });
        }
        return res.status(500).json({ success: false, message: "Помилка сервера при оновленні категорії" });
    }
};

// ==========================================
// 4. DELETE
// ПРИМІТКА: FK products.category_id має ON DELETE SET NULL — видалення
// категорії НЕ падає з помилкою, товари просто лишаються без категорії
// (category_id = NULL). Це закладено в схемі, а не баг.
// ==========================================
exports.deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM categories WHERE id = $1 RETURNING id", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Категорію не знайдено" });
        }
        return res.status(200).json({ success: true, message: "Категорію видалено. Товари цієї категорії позначені як без категорії." });
    } catch (error) {
        console.error("Помилка DELETE category:", error.message);
        return res.status(500).json({ success: false, message: "Помилка сервера при видаленні категорії" });
    }
};