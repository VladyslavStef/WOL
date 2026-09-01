const pool = require("../config/db");

// Той самий транслітератор, що й у productController.js — навмисно
// продубльований тут, щоб не створювати нову спільну залежність між
// контролерами на цьому етапі (низький ризик, легко винести пізніше).
const CYRILLIC_MAP = {
    а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie",
    ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l",
    м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "",
    ю: "iu", я: "ia", ы: "y", э: "e", ъ: ""
};

const transliterate = (text) => {
    return text
        .toString()
        .toLowerCase()
        .split("")
        .map((char) => (CYRILLIC_MAP[char] !== undefined ? CYRILLIC_MAP[char] : char))
        .join("");
};

const slugify = (text) => {
    return transliterate(text)
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// FIX: після повного ресету БД на чисту модель categories → products
// (окремий db.sql) старих "category-as-product" рядків більше НЕ ІСНУЄ
// фізично — їх ніколи не створює новий сідинг. Список-виключення
// (LEGACY_CATEGORY_PLACEHOLDER_SLUGS), що раніше був тут, прибрано —
// він був мертвим кодом старої моделі й міг ввести в оману майбутню
// розробку. Товари фільтруються ВИКЛЮЧНО за product_type='physical'
// і category_id — жодних текстових винятків.

// ==========================================
// GET /categories — каталог: категорії з вкладеними товарами
// ==========================================
exports.getAllCategories = async (req, res) => {
    try {
        const categoriesRes = await pool.query(
            `SELECT id, slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order
             FROM categories
             WHERE is_active = true
             ORDER BY display_group, sort_order`
        );

        const categories = categoriesRes.rows;

        let productsByCategoryId = {};

        if (categories.length > 0) {
            const categoryIds = categories.map((category) => category.id);

            const productsRes = await pool.query(
                `SELECT id, category_id, slug, title, description, price, currency,
                        image_url, icon_url, alt, sort_order
                 FROM products
                 WHERE category_id = ANY($1::bigint[])
                   AND product_type = 'physical'
                   AND is_active = true
                 ORDER BY sort_order ASC`,
                [categoryIds]
            );

            for (const product of productsRes.rows) {
                if (!productsByCategoryId[product.category_id]) {
                    productsByCategoryId[product.category_id] = [];
                }
                productsByCategoryId[product.category_id].push({
                    id: product.id,
                    slug: product.slug,
                    name: product.title,
                    description: product.description,
                    price: Number(product.price),
                    currency: product.currency,
                    image: product.image_url,
                    icon: product.icon_url,
                    alt: product.alt || product.title,
                    priceValue: Number(product.price),
                    sortOrder: product.sort_order
                });
            }
        }

        const data = categories.map((category) => ({
            id: category.id,
            slug: category.slug,
            name: category.name,
            description: category.description,
            priceLabel: category.price_label,
            image: category.image_url,
            icon: category.icon_url,
            alt: category.alt,
            displayGroup: category.display_group,
            sortOrder: category.sort_order,
            products: productsByCategoryId[category.id] || []
        }));

        return res.status(200).json({
            success: true,
            count: data.length,
            data
        });

    } catch (error) {
        console.error("Помилка отримання каталогу категорій:", error.message);
        return res.status(500).json({ success: false, message: "Помилка сервера при отриманні категорій" });
    }
};


// ==========================================
// ADMIN: повний список категорій (включно з неактивними)
// ==========================================
exports.getAllCategoriesAdmin = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, slug, name, description, price_label, image_url, icon_url, alt,
                    display_group, sort_order, is_active, created_at, updated_at
             FROM categories
             ORDER BY display_group, sort_order`
        );

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error("Помилка READ categories (admin):", error.message);
        return res.status(500).json({ success: false, message: "Помилка сервера при отриманні категорій" });
    }
};


// ==========================================
// ADMIN: створення категорії
// ==========================================
exports.createCategory = async (req, res) => {
    const {
        name, description, price_label, image_url, icon_url, alt,
        display_group, sort_order, is_active
    } = req.body;

    const created_by_admin_id = req.admin.id;
    let { slug } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ success: false, message: "Назва категорії є обов'язковою" });
    }

    const validDisplayGroups = ['products', 'seedlings'];
    const dGroup = display_group || 'products';
    if (!validDisplayGroups.includes(dGroup)) {
        return res.status(400).json({ success: false, message: "Група каталогу може бути лише 'products' або 'seedlings'" });
    }

    if (!slug || !slug.trim()) {
        slug = slugify(name);
    } else {
        slug = slugify(slug);
    }
    if (!slug) {
        slug = `category-${Date.now()}`;
    }

    try {
        const result = await pool.query(
            `INSERT INTO categories (
                slug, name, description, price_label, image_url, icon_url, alt,
                display_group, sort_order, is_active, created_by_admin_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *`,
            [
                slug,
                name.trim(),
                description || null,
                price_label || null,
                image_url || null,
                icon_url || null,
                alt || name.trim(),
                dGroup,
                sort_order !== undefined ? parseInt(sort_order) : 0,
                is_active !== undefined ? Boolean(is_active) : true,
                created_by_admin_id
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Категорію успішно створено",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Помилка CREATE category:", error.message);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: "Категорія з таким slug вже існує" });
        }
        return res.status(500).json({ success: false, message: "Помилка сервера при створенні категорії" });
    }
};


// ==========================================
// ADMIN: редагування категорії
// КРИТИЧНО: чіпає ЛИШЕ рядок у categories. Жоден запит тут не
// торкається таблиці products — товари категорії лишаються незмінними.
// ==========================================
exports.updateCategory = async (req, res) => {
    const { id } = req.params;
    const {
        name, description, price_label, image_url, icon_url, alt,
        display_group, sort_order, is_active
    } = req.body;

    let { slug } = req.body;

    if (display_group !== undefined && !['products', 'seedlings'].includes(display_group)) {
        return res.status(400).json({ success: false, message: "Група каталогу може бути лише 'products' або 'seedlings'" });
    }

    try {
        const checkRes = await pool.query("SELECT * FROM categories WHERE id = $1", [id]);
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Категорію не знайдено" });
        }

        if (slug) {
            slug = slugify(slug);
        } else {
            slug = checkRes.rows[0].slug;
        }

        const result = await pool.query(
            `UPDATE categories
             SET slug = $1, name = $2, description = $3, price_label = $4, image_url = $5,
                 icon_url = $6, alt = $7, display_group = $8, sort_order = $9, is_active = $10
             WHERE id = $11
             RETURNING *`,
            [
                slug,
                name !== undefined ? name.trim() : checkRes.rows[0].name,
                description !== undefined ? description : checkRes.rows[0].description,
                price_label !== undefined ? price_label : checkRes.rows[0].price_label,
                image_url !== undefined ? image_url : checkRes.rows[0].image_url,
                icon_url !== undefined ? icon_url : checkRes.rows[0].icon_url,
                alt !== undefined ? alt : checkRes.rows[0].alt,
                display_group !== undefined ? display_group : checkRes.rows[0].display_group,
                sort_order !== undefined ? parseInt(sort_order) : checkRes.rows[0].sort_order,
                is_active !== undefined ? Boolean(is_active) : checkRes.rows[0].is_active,
                id
            ]
        );

        return res.status(200).json({
            success: true,
            message: "Категорію успішно оновлено",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Помилка UPDATE category:", error.message);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: "Категорія з таким slug вже існує" });
        }
        return res.status(500).json({ success: false, message: "Помилка сервера при оновленні категорії" });
    }
};


// ==========================================
// ADMIN: видалення категорії
// Захист: не дозволяє видалити категорію, якщо до неї прив'язані товари —
// інакше products.category_id занулився б непомітно для адміна
// (ON DELETE SET NULL), і товари "осиротіли" б без категорії.
// ==========================================
exports.deleteCategory = async (req, res) => {
    const { id } = req.params;

    try {
        const linkedProducts = await pool.query(
            "SELECT count(*)::int AS count FROM products WHERE category_id = $1",
            [id]
        );

        if (linkedProducts.rows[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: `Неможливо видалити категорію: до неї прив'язано ${linkedProducts.rows[0].count} товар(ів). Спершу перепризначте або видаліть ці товари.`
            });
        }

        const result = await pool.query("DELETE FROM categories WHERE id = $1 RETURNING id", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Категорію не знайдено" });
        }

        return res.status(200).json({ success: true, message: "Категорію видалено" });

    } catch (error) {
        console.error("Помилка DELETE category:", error.message);
        return res.status(500).json({ success: false, message: "Помилка сервера при видаленні категорії" });
    }
};
