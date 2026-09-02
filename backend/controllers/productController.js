const pool = require("../config/db");
const { slugify } = require("../utils/slugify");

function mapProduct(p) {
    return {
        id: p.id,
        slug: p.slug,
        sku: p.sku,
        title: p.title,
        description: p.description,
        price: Number(p.price),
        currency: p.currency,
        image: p.image_url,
        icon: p.icon_url,
        alt: p.alt,
        categoryId: p.category_id,
        displayGroup: p.display_group,
        productType: p.product_type,
        pricingMode: p.pricing_mode,
        stock: p.stock,
        sortOrder: p.sort_order,
        isActive: p.is_active
    };
}

// ==========================================
// 1a. READ: публічна вітрина (тільки активні)
// FIX: раніше SELECT посилався на неіснучу колонку products.category —
// звідси "Помилка READ products: стовпця category не існує". Тепер
// беремо реальні колонки category_id/alt і мапимо у camelCase.
// ==========================================
exports.getAllProducts = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, slug, sku, title, description, price, currency,
                   image_url, icon_url, alt, category_id, product_type, pricing_mode,
                   stock, sort_order, is_active, display_group, created_at, updated_at
            FROM products
            WHERE is_active = true
            ORDER BY sort_order ASC, title ASC;
        `);
        return res.status(200).json({ success: true, count: result.rows.length, data: result.rows.map(mapProduct) });
    } catch (error) {
        console.error("Помилка READ products:", error.message);
        return res.status(500).json({ success: false, message: "Внутрішня помилка сервера при отриманні каталогу" });
    }
};

// ==========================================
// 1b. READ: адмінська вітрина (активні + неактивні)
// FIX: раніше адмінка ходила на публічний GET /products (WHERE is_active=true)
// і губила деактивовані товари без можливості їх повернути.
// ==========================================
exports.getAllProductsAdmin = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, slug, sku, title, description, price, currency,
                   image_url, icon_url, alt, category_id, product_type, pricing_mode,
                   stock, sort_order, is_active, display_group, created_at, updated_at
            FROM products
            ORDER BY sort_order ASC, title ASC;
        `);
        return res.status(200).json({ success: true, count: result.rows.length, data: result.rows.map(mapProduct) });
    } catch (error) {
        console.error("Помилка READ products (admin):", error.message);
        return res.status(500).json({ success: false, message: "Внутрішня помилка сервера при отриманні списку товарів" });
    }
};

// ==========================================
// 2. CREATE
// ==========================================
exports.createProduct = async (req, res) => {
    const {
        title, description, price, currency, image_url, icon_url, alt,
        category_id, display_group, product_type, pricing_mode, stock, sort_order, is_active
    } = req.body;
    const created_by_admin_id = req.admin.id;
    let { slug, sku } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ success: false, message: "Назва товару є обов'язковою" });
    }
    if (price === undefined || isNaN(price) || Number(price) < 0) {
        return res.status(400).json({ success: false, message: "Ціна повинна бути числом рівним або більшим за 0" });
    }

    const validTypes = ['physical', 'ticket'];
    const pType = product_type || 'physical';
    if (!validTypes.includes(pType)) {
        return res.status(400).json({ success: false, message: "Тип продукту може бути лише 'physical' або 'ticket'" });
    }

    const validDisplayGroups = ['products', 'seedlings'];
    const dGroup = display_group || 'products';
    if (!validDisplayGroups.includes(dGroup)) {
        return res.status(400).json({ success: false, message: "Група каталогу може бути лише 'products' або 'seedlings'" });
    }

    let pMode = pricing_mode || null;
    if (pType === 'ticket' && !pMode) {
        return res.status(400).json({ success: false, message: "Для квитків обов'язково вказувати pricing_mode ('person' або 'hour')" });
    }
    if (pMode && !['person', 'hour'].includes(pMode)) {
        return res.status(400).json({ success: false, message: "Неправильний режим ціноутворення. Дозволено: 'person' або 'hour'" });
    }

    let productStock = stock !== undefined ? parseInt(stock) : null;
    if (productStock !== null && productStock < 0) {
        return res.status(400).json({ success: false, message: "Кількість на складі не може бути від'ємною" });
    }

    // FIX: category_id — реальна FK-колонка, замінює стару текстову category
    let categoryId = (category_id !== undefined && category_id !== null && category_id !== "")
        ? parseInt(category_id) : null;
    if (categoryId !== null && isNaN(categoryId)) {
        return res.status(400).json({ success: false, message: "Некоректний ідентифікатор категорії" });
    }

    if (!slug || !slug.trim()) slug = slugify(title);
    else slug = slugify(slug);
    if (!slug) slug = `product-${Date.now()}`;

    try {
        const result = await pool.query(`
            INSERT INTO products (
                slug, sku, title, description, price, currency,
                image_url, icon_url, alt, category_id, display_group, product_type, pricing_mode,
                stock, sort_order, is_active, created_by_admin_id
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            RETURNING *;
        `, [
            slug, sku || null, title.trim(), description || null, Number(price),
            currency || 'UAH', image_url || null, icon_url || null, alt || null,
            categoryId, dGroup, pType, pMode, productStock,
            sort_order !== undefined ? parseInt(sort_order) : 0,
            is_active !== undefined ? Boolean(is_active) : true,
            created_by_admin_id
        ]);
        return res.status(201).json({ success: true, message: "Товар успішно створено", data: mapProduct(result.rows[0]) });
    } catch (error) {
        console.error("Помилка CREATE product:", error.message);
        if (error.code === '23505') {
            if (error.detail && error.detail.includes('slug')) {
                return res.status(400).json({ success: false, message: "Товар з таким унікальним URL (slug) вже існує" });
            }
            if (error.detail && error.detail.includes('sku')) {
                return res.status(400).json({ success: false, message: "Товар з таким артикулом (SKU) вже існує" });
            }
        }
        if (error.code === '23503') {
            return res.status(400).json({ success: false, message: "Вказаної категорії або адміністратора не існує в системі" });
        }
        return res.status(500).json({ success: false, message: "Помилка сервера при збереженні товару" });
    }
};

// ==========================================
// 3. UPDATE
// ==========================================
exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const {
        title, description, price, currency, image_url, icon_url, alt,
        category_id, display_group, product_type, pricing_mode, stock, sort_order, is_active
    } = req.body;
    const updated_by_admin_id = req.admin.id;
    let { slug, sku } = req.body;

    try {
        const checkRes = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Товар для оновлення не знайдено" });
        }
        const existing = checkRes.rows[0];

        if (display_group !== undefined && !['products', 'seedlings'].includes(display_group)) {
            return res.status(400).json({ success: false, message: "Група каталогу може бути лише 'products' або 'seedlings'" });
        }

        if (slug) slug = slugify(slug);
        else if (title) slug = slugify(title);
        else slug = existing.slug;

        let categoryId = existing.category_id;
        if (category_id !== undefined) {
            categoryId = (category_id === null || category_id === "") ? null : parseInt(category_id);
            if (categoryId !== null && isNaN(categoryId)) {
                return res.status(400).json({ success: false, message: "Некоректний ідентифікатор категорії" });
            }
        }

        const result = await pool.query(`
            UPDATE products
            SET slug=$1, sku=$2, title=$3, description=$4, price=$5, currency=$6,
                image_url=$7, icon_url=$8, alt=$9, category_id=$10, display_group=$11,
                product_type=$12, pricing_mode=$13, stock=$14, sort_order=$15,
                is_active=$16, updated_by_admin_id=$17
            WHERE id=$18
            RETURNING *;
        `, [
            slug,
            sku !== undefined ? sku : existing.sku,
            title !== undefined ? title.trim() : existing.title,
            description !== undefined ? description : existing.description,
            price !== undefined ? Number(price) : existing.price,
            currency !== undefined ? currency : existing.currency,
            image_url !== undefined ? image_url : existing.image_url,
            icon_url !== undefined ? icon_url : existing.icon_url,
            alt !== undefined ? alt : existing.alt,
            categoryId,
            display_group !== undefined ? display_group : existing.display_group,
            product_type !== undefined ? product_type : existing.product_type,
            pricing_mode !== undefined ? pricing_mode : existing.pricing_mode,
            stock !== undefined ? (stock !== null ? parseInt(stock) : null) : existing.stock,
            sort_order !== undefined ? parseInt(sort_order) : existing.sort_order,
            is_active !== undefined ? Boolean(is_active) : existing.is_active,
            updated_by_admin_id,
            id
        ]);

        return res.status(200).json({ success: true, message: "Товар успішно оновлено", data: mapProduct(result.rows[0]) });
    } catch (error) {
        console.error("Помилка UPDATE product:", error.message);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: "Помилка! Такий унікальний slug або SKU вже присвоєно іншому товару" });
        }
        if (error.code === '23503') {
            return res.status(400).json({ success: false, message: "Вказаної категорії не існує в системі" });
        }
        return res.status(500).json({ success: false, message: "Помилка сервера при оновленні товару" });
    }
};

// ==========================================
// 4. DELETE
// FIX: FK products.category_id має ON DELETE SET NULL, а не RESTRICT,
// тому 23503 тут стосується лише зв'язків з orders/bookings, як і раніше.
// ==========================================
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Товар не знайдено у базі даних" });
        }
        return res.status(200).json({ success: true, message: "Товар повністю видалено з каталогу" });
    } catch (error) {
        console.error("Помилка DELETE product:", error.message);
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: "Неможливо видалити цей товар, оскільки він зафіксований в існуючих замовленнях або бронюваннях. Рекомендуємо вимкнути його через is_active=false."
            });
        }
        return res.status(500).json({ success: false, message: "Внутрішня помилка сервера при спробі видалення" });
    }
};