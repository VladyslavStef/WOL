const pool = require("../config/db");

// FIX: JS-регулярка \w НЕ включає кирилицю. Стара slugify() видаляла всі
// українські літери, тож "Гідролат Лаванди" і "Гідролат Кропиви" обидва
// перетворювались на "-" — другий INSERT падав з помилкою унікальності slug.
// Тепер спершу транслітеруємо кирилицю в латиницю, і тільки потім чистимо.
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

// Вспоміжна функція для генерації slug (якщо адмін не ввів його вручну)
const slugify = (text) => {
    return transliterate(text)
        .trim()
        .replace(/\s+/g, '-')           // Заміна пробілів на дефіси
        .replace(/[^\w\-]+/g, '')       // Видалення спецсимволів
        .replace(/\-\-+/g, '-')         // Видалення подвійних дефісів
        .replace(/^-+|-+$/g, '');       // Прибираємо дефіси на початку/кінці
};

// ... CYRILLIC_MAP, transliterate, slugify — без змін ...

// ==========================================
// 1a. READ: публічна вітрина (тільки активні)
// ==========================================
exports.getAllProducts = async (req, res) => {
    try {
        const queryText = `
            SELECT id, slug, sku, title, description, price, currency, 
                   image_url, icon_url, category, display_group, product_type, pricing_mode, 
                   stock, sort_order, is_active, created_at, updated_at
            FROM products 
            WHERE is_active = true 
            ORDER BY sort_order ASC, title ASC;
        `;
        const result = await pool.query(queryText);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error("Помилка READ products:", error.message);
        return res.status(500).json({ success: false, message: "Внутрішня помилка сервера при отриманні каталогу" });
    }
};

// ==========================================
// 1b. READ: адмінська вітрина (активні + неактивні)
// FIX: раніше адмінка ходила на публічний GET /products, який фільтрує
// WHERE is_active = true — деактивований товар зникав з адмінки без
// можливості повернути. Тепер окремий захищений маршрут без цього фільтра.
// ==========================================
exports.getAllProductsAdmin = async (req, res) => {
    try {
        const queryText = `
            SELECT id, slug, sku, title, description, price, currency, 
                   image_url, icon_url, category, display_group, product_type, pricing_mode, 
                   stock, sort_order, is_active, created_at, updated_at
            FROM products 
            ORDER BY sort_order ASC, title ASC;
        `;
        const result = await pool.query(queryText);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error("Помилка READ products (admin):", error.message);
        return res.status(500).json({ success: false, message: "Внутрішня помилка сервера при отриманні списку товарів" });
    }
};

// ==========================================
// 2. CREATE
// FIX: додано display_group — раніше поле приходило з форми і губилося,
// новий товар завжди отримував дефолт 'products' незалежно від вибору адміна.
// ==========================================
exports.createProduct = async (req, res) => {
    const {
        title, description, price, currency, image_url, icon_url, 
        category, display_group, product_type, pricing_mode, stock, sort_order, 
        is_active
    } = req.body;

    const created_by_admin_id = req.admin.id; 

    let { slug, sku } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ success: false, message: "Назва товару є обов'язковою" });
    }

    if (price === undefined || isNaN(price) || Number(price) < 0) {
        return res.status(400).json({ success: false, message: "Ціна повинна бути числом рівним або більшим за 0" });
    }

    if (!created_by_admin_id) {
        return res.status(400).json({ success: false, message: "Ідентифікатор адміністратора (created_by_admin_id) обов'язковий" });
    }

    const validTypes = ['physical', 'ticket'];
    const pType = product_type || 'physical';
    if (!validTypes.includes(pType)) {
        return res.status(400).json({ success: false, message: "Тип продукту може бути лише 'physical' або 'ticket'" });
    }

    // FIX: валідація display_group за тим самим CHECK, що і в БД
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

    if (!slug || !slug.trim()) {
        slug = slugify(title);
    } else {
        slug = slugify(slug);
    }

    if (!slug) {
        slug = `product-${Date.now()}`;
    }

    try {
        const queryText = `
            INSERT INTO products (
                slug, sku, title, description, price, currency, 
                image_url, icon_url, category, display_group, product_type, pricing_mode, 
                stock, sort_order, is_active, created_by_admin_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *;
        `;

        const values = [
            slug,
            sku || null,
            title.trim(),
            description || null,
            Number(price),
            currency || 'UAH',
            image_url || null,
            icon_url || null,
            category || null,
            dGroup,
            pType,
            pMode,
            productStock,
            sort_order !== undefined ? parseInt(sort_order) : 0,
            is_active !== undefined ? Boolean(is_active) : true,
            created_by_admin_id
        ];

        const result = await pool.query(queryText, values);
        return res.status(201).json({
            success: true,
            message: "Товар успішно створено",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Помилка CREATE product:", error.message);
        if (error.code === '23505') {
            if (error.detail.includes('slug')) {
                return res.status(400).json({ success: false, message: "Товар з таким унікальним URL (slug) вже існує" });
            }
            if (error.detail.includes('sku')) {
                return res.status(400).json({ success: false, message: "Товар з таким артикулом (SKU) вже існує" });
            }
        }
        if (error.code === '23503') {
            return res.status(400).json({ success: false, message: "Вказаного адміністратора (created_by_admin_id) не існує в системі" });
        }
        return res.status(500).json({ success: false, message: "Помилка сервера при збереженні товару" });
    }
};

// ==========================================
// 3. UPDATE
// FIX: додано display_group у деструктуризацію та в UPDATE-запит —
// раніше зміна групи каталогу через адмінку взагалі не зберігалась.
// ==========================================
exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const {
        title, description, price, currency, image_url, icon_url, 
        category, display_group, product_type, pricing_mode, stock, sort_order, 
        is_active
    } = req.body;

    const updated_by_admin_id = req.admin.id;

    let { slug, sku } = req.body;

    if (!updated_by_admin_id) {
        return res.status(400).json({ success: false, message: "Необхідно вказати ID адміна, який здійснює оновлення (updated_by_admin_id)" });
    }

    try {
        const checkRes = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Товар для оновлення не знайдено" });
        }

        if (slug) slug = slugify(slug);
        else if (title && !slug) slug = slugify(title);
        else slug = checkRes.rows[0].slug;

        // FIX: валідація display_group, якщо його передали
        if (display_group !== undefined && !['products', 'seedlings'].includes(display_group)) {
            return res.status(400).json({ success: false, message: "Група каталогу може бути лише 'products' або 'seedlings'" });
        }

        const queryText = `
            UPDATE products 
            SET slug = $1, sku = $2, title = $3, description = $4, price = $5, 
                currency = $6, image_url = $7, icon_url = $8, category = $9, 
                display_group = $10, product_type = $11, pricing_mode = $12, stock = $13, 
                sort_order = $14, is_active = $15, updated_by_admin_id = $16
            WHERE id = $17
            RETURNING *;
        `;

        const values = [
            slug,
            sku !== undefined ? sku : checkRes.rows[0].sku,
            title !== undefined ? title.trim() : checkRes.rows[0].title,
            description !== undefined ? description : checkRes.rows[0].description,
            price !== undefined ? Number(price) : checkRes.rows[0].price,
            currency !== undefined ? currency : checkRes.rows[0].currency,
            image_url !== undefined ? image_url : checkRes.rows[0].image_url,
            icon_url !== undefined ? icon_url : checkRes.rows[0].icon_url,
            category !== undefined ? category : checkRes.rows[0].category,
            display_group !== undefined ? display_group : checkRes.rows[0].display_group,
            product_type !== undefined ? product_type : checkRes.rows[0].product_type,
            pricing_mode !== undefined ? pricing_mode : checkRes.rows[0].pricing_mode,
            stock !== undefined ? (stock !== null ? parseInt(stock) : null) : checkRes.rows[0].stock,
            sort_order !== undefined ? parseInt(sort_order) : checkRes.rows[0].sort_order,
            is_active !== undefined ? Boolean(is_active) : checkRes.rows[0].is_active,
            updated_by_admin_id,
            id
        ];

        const result = await pool.query(queryText, values);

        return res.status(200).json({
            success: true,
            message: "Товар успішно оновлено",
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Помилка UPDATE product:", error.message);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: "Помилка! Такий унікальний slug або SKU вже присвоєно іншому товару" });
        }
        return res.status(500).json({ success: false, message: "Помилка сервера при оновленні товару" });
    }
};

// ==========================================
// 4. DELETE — без змін
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
                message: "Неможливо видалити цей товар, оскільки він зафіксований в існуючих замовленнях або бронюваннях. Рекомендуємо замість видалення просто вимкнути його через параметр is_active = false."
            });
        }
        return res.status(500).json({ success: false, message: "Внутрішня помилка сервера при спробі видалення" });
    }
};