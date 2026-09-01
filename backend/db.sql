-- ============================================================
-- Wonder of Lavender — db.sql
-- ПОВНЕ СТВОРЕННЯ БАЗИ З НУЛЯ (нова, чиста модель)
--
-- МОДЕЛЬ:
--   categories = окремі категорії (НЕ товари)
--   products   = лише реальні товари + квитки, з category_id → categories.id
--
-- Категорія НЕ є товаром. Немає жодного products.category (текстове поле)
-- і немає жодного "category-placeholder" рядка серед products.
--
-- Виконувати ЦІЛИМИ БЛОКАМИ по порядку:
--   1) СХЕМА (безпечно запускати одразу на порожній базі)
--   2) Вручну створити хоча б одного адміна з РЕАЛЬНИМ bcrypt-хешем
--      (node scripts/hashPassword.js "пароль") — НЕ встановлюється тут.
--   3) СІДИНГ категорій і товарів (вимагає існування admin, інакше
--      явно впаде з зрозумілою помилкою — це навмисно, безпеки заради).
--   4) ПЕРЕВІРКИ — SELECT-запити наприкінці файлу.
-- ============================================================


-- ============================================================
-- ЧАСТИНА 1: СХЕМА
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS admin (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    price_label TEXT,
    image_url TEXT,
    icon_url TEXT,
    alt TEXT,
    display_group TEXT NOT NULL DEFAULT 'products',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by_admin_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_categories_display_group CHECK (display_group IN ('products', 'seedlings')),
    CONSTRAINT fk_categories_created_by_admin FOREIGN KEY (created_by_admin_id)
        REFERENCES admin(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    sku TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'UAH',
    image_url TEXT,
    icon_url TEXT,
    alt TEXT,
    category_id BIGINT,                 -- NULL дозволено (квитки без категорії)
    product_type TEXT NOT NULL DEFAULT 'physical',
    pricing_mode TEXT,
    stock INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_group TEXT NOT NULL DEFAULT 'products',
    created_by_admin_id BIGINT NOT NULL,
    updated_by_admin_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_products_price CHECK (price >= 0),
    CONSTRAINT chk_products_stock CHECK (stock IS NULL OR stock >= 0),
    CONSTRAINT chk_products_type CHECK (product_type IN ('physical', 'ticket')),
    CONSTRAINT chk_products_pricing_mode CHECK (pricing_mode IS NULL OR pricing_mode IN ('person', 'hour')),
    CONSTRAINT chk_ticket_pricing_mode CHECK (product_type = 'physical' OR pricing_mode IS NOT NULL),
    CONSTRAINT chk_products_display_group CHECK (display_group IN ('products', 'seedlings')),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id)
        REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_products_created_by_admin FOREIGN KEY (created_by_admin_id)
        REFERENCES admin(id) ON DELETE RESTRICT,
    CONSTRAINT fk_products_updated_by_admin FOREIGN KEY (updated_by_admin_id)
        REFERENCES admin(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_code TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'UAH',
    status TEXT NOT NULL DEFAULT 'new',
    payment_method TEXT,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_orders_code CHECK (order_code ~ '^WOL-[A-Z0-9]{6}$'),
    CONSTRAINT chk_orders_total_price CHECK (total_price >= 0),
    CONSTRAINT chk_orders_status CHECK (status IN ('new', 'processing', 'confirmed', 'completed', 'cancelled')),
    CONSTRAINT chk_orders_payment_status CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded'))
);

CREATE TABLE IF NOT EXISTS ordered_products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT,                  -- NULL дозволено для історичних замовлень
    quantity INTEGER NOT NULL DEFAULT 1,
    price_per_item NUMERIC(10, 2) NOT NULL,
    product_title TEXT NOT NULL,        -- знімок назви на момент замовлення (для історії)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_ordered_products_quantity CHECK (quantity > 0),
    CONSTRAINT chk_ordered_products_price CHECK (price_per_item >= 0),
    CONSTRAINT fk_ordered_products_order FOREIGN KEY (order_id)
        REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_ordered_products_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_code TEXT NOT NULL UNIQUE,
    product_id BIGINT,                  -- NULL дозволено
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    booking_date DATE NOT NULL,
    visitors INTEGER NOT NULL,
    product_title TEXT NOT NULL,
    ticket_price NUMERIC(10, 2) NOT NULL,
    pricing_mode TEXT NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'UAH',
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_bookings_code CHECK (booking_code ~ '^WOL-[A-Z0-9]{6}$'),
    CONSTRAINT chk_bookings_visitors CHECK (visitors > 0 AND visitors <= 30),
    CONSTRAINT chk_bookings_ticket_price CHECK (ticket_price >= 0),
    CONSTRAINT chk_bookings_total_price CHECK (total_price >= 0),
    CONSTRAINT chk_bookings_pricing_mode CHECK (pricing_mode IN ('person', 'hour')),
    CONSTRAINT chk_bookings_status CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    CONSTRAINT fk_bookings_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS booking_times (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_booking_times_range CHECK (start_time < end_time),
    CONSTRAINT uq_booking_times_slot UNIQUE (booking_id, start_time, end_time),
    CONSTRAINT fk_booking_times_booking FOREIGN KEY (booking_id)
        REFERENCES bookings(id) ON DELETE CASCADE
);

-- Індекси
CREATE INDEX IF NOT EXISTS idx_categories_display_group ON categories(display_group);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_by_admin ON products(created_by_admin_id);
CREATE INDEX IF NOT EXISTS idx_products_display_group ON products(display_group);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);

CREATE INDEX IF NOT EXISTS idx_ordered_products_order ON ordered_products(order_id);
CREATE INDEX IF NOT EXISTS idx_ordered_products_product ON ordered_products(product_id);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_product ON bookings(product_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

CREATE INDEX IF NOT EXISTS idx_booking_times_booking ON booking_times(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_times_start ON booking_times(start_time);

-- Тригер updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_updated_at ON admin;
CREATE TRIGGER trg_admin_updated_at BEFORE UPDATE ON admin FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;


-- ============================================================
-- ЧАСТИНА 2: АДМІН (виконати ВРУЧНУ перед сідингом нижче)
-- ============================================================
-- НЕ вставляй тут пароль у відкритому вигляді.
--   1. node scripts/hashPassword.js "твій_реальний_пароль"
--   2. Скопіюй згенерований bcrypt-хеш (починається на $2a$ або $2b$)
--   3. Виконай:
--
-- INSERT INTO admin (name, password_hash)
-- VALUES ('wonder_of_lavender', '$2a$10$ВСТАВ_СЮДИ_ЗГЕНЕРОВАНИЙ_ХЕШ');
--
-- Без цього кроку ЧАСТИНА 3 нижче свідомо впаде з RAISE EXCEPTION.


-- ============================================================
-- ЧАСТИНА 3: СІДИНГ categories + products
-- ============================================================

BEGIN;

DO $$
DECLARE
    v_admin_id BIGINT;
BEGIN
    SELECT id INTO v_admin_id FROM admin ORDER BY id LIMIT 1;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Немає жодного рядка в admin. Спочатку створи адміна (див. ЧАСТИНУ 2 вище), потім повтори ЧАСТИНУ 3.';
    END IF;

    -- ==========================================================
    -- CATEGORIES (13)
    -- ==========================================================
    INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id) VALUES ('hydrolats', 'Гідролати', '(100 г)', 'Від 100 грн', '/frontend/IMG/lavender__title.png', NULL, 'Гідролати', 'products', 0, true, v_admin_id);
    INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id) VALUES ('oils', 'Олії', '(5 мг)', 'Від 250 грн', '/frontend/IMG/oil.png', NULL, 'Олії', 'products', 1, true, v_admin_id);
    INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id) VALUES ('soaps', 'Мила', '(100 г)', 'Від 150 грн', '/frontend/IMG/soap_big.png', NULL, 'Мила', 'products', 2, true, v_admin_id);
    INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id) VALUES ('tea', 'Чаї', '(100г)', 'Від 100 грн', '/frontend/IMG/teas.png', NULL, 'Чай', 'products', 3, true, v_admin_id);
    INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id) VALUES ('honey', 'Меди', '(100г)', 'Від 100 грн', '/frontend/IMG/honey.jpg', NULL, 'Меди', 'products', 4, true, v_admin_id);
    INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id) VALUES ('bouquettes', 'Букети', NULL, 'Від 100 грн', '/frontend/IMG/bouquettes.png', NULL, 'Букети', 'products', 5, true, v_admin_id);
    INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id) VALUES ('candles', 'Свічки', '(80г)', 'Від 100 грн', '/frontend/IMG/candle.png', NULL, 'Свічки', 'products', 6, true, v_admin_id);
    INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id) VALUES ('lavender-seedlings', 'Лаванда', 'Ароматні саджанці лаванди для саду та ландшафтного оформлення', 'Від 120 грн', '/frontend/IMG/lavender_surprise.png', NULL, 'Саджанці лаванди', 'seedlings', 0, true, v_admin_id);
    INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id) VALUES ('rose-seedlings', 'Троянди', 'Саджанці декоративних троянд для саду та клумб', 'Від 180 грн', '/frontend/IMG/lavender_surprise.png', NULL, 'Саджанці троянд', 'seedlings', 1, true, v_admin_id);
    INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id) VALUES ('ornamental-grasses', 'Декоративні трави', 'Багаторічні трави для сучасного ландшафтного дизайну', 'Від 100 грн', '/frontend/IMG/lavender_surprise.png', NULL, 'Декоративні трави', 'seedlings', 2, true, v_admin_id);
    INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id) VALUES ('conifer-seedlings', 'Хвойні рослини', 'Вічнозелені саджанці для саду, живоплоту та композицій', 'Від 200 грн', '/frontend/IMG/lavender_surprise.png', NULL, 'Саджанці хвойних рослин', 'seedlings', 3, true, v_admin_id);
    INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id) VALUES ('shrub-seedlings', 'Декоративні кущі', 'Квітучі та декоративні кущі для оформлення саду', 'Від 170 грн', '/frontend/IMG/lavender_surprise.png', NULL, 'Саджанці декоративних кущів', 'seedlings', 4, true, v_admin_id);
    INSERT INTO categories (slug, name, description, price_label, image_url, icon_url, alt, display_group, sort_order, is_active, created_by_admin_id) VALUES ('perennial-flowers', 'Багаторічні квіти', 'Квітучі багаторічники для клумб та садових композицій', 'Від 90 грн', '/frontend/IMG/lavender_surprise.png', NULL, 'Багаторічні садові квіти', 'seedlings', 5, true, v_admin_id);

    -- ==========================================================
    -- PRODUCTS: реальні товари (18) — прив'язка за slug категорії
    -- ==========================================================
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'hidrolat-lavandy', 'Гідролат Лаванди', 'Для обличчя та тіла (100 г)', 125, '/frontend/IMG/lavender__hydr.png', '/frontend/IMG/hidr_lav.png', 'Гідролат Лаванди', c.id, 'physical', c.display_group, 0, true, v_admin_id FROM categories c WHERE c.slug = 'hydrolats';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'hidrolat-kropyvy', 'Гідролат Кропиви', 'Звужує пори та знімає запалення', 150, '/frontend/IMG/kropyva__hydr.png', '/frontend/IMG/hidr_krop.png', 'Гідролат Кропиви', c.id, 'physical', c.display_group, 1, true, v_admin_id FROM categories c WHERE c.slug = 'hydrolats';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'hidrolat-chystotilu', 'Гідролат Чистотілу', 'Для лиця та тіла', 150, '/frontend/IMG/chystotil__hydr.png', '/frontend/IMG/hidr_chys.png', 'Гідролат Чистотілу', c.id, 'physical', c.display_group, 2, true, v_admin_id FROM categories c WHERE c.slug = 'hydrolats';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'malenke-mylo', 'Маленьке Мило', 'Для обличчя та тіла (100 г)', 125, '/frontend/IMG/soap_small.png', NULL, 'Маленьке Мило', c.id, 'physical', c.display_group, 0, true, v_admin_id FROM categories c WHERE c.slug = 'soaps';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'velyke-mylo', 'Велике Мило', 'Для обличчя та тіла (100 г)', 150, '/frontend/IMG/soap_big.png', NULL, 'Велике Мило', c.id, 'physical', c.display_group, 1, true, v_admin_id FROM categories c WHERE c.slug = 'soaps';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'buket-lavandy', 'Букет Лаванди', 'Букетик карпатської лаванди', 100, '/frontend/IMG/bouquette.png', NULL, 'Букет Лаванди', c.id, 'physical', c.display_group, 0, true, v_admin_id FROM categories c WHERE c.slug = 'bouquettes';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'lavanda-syurpryz', 'Лаванда Сюрприз', 'Морозостійкий сорт із насиченим ароматом та фіолетовим цвітінням', 120, '/frontend/IMG/lavender__hydr.png', NULL, 'Саджанець лаванди вузьколистої', c.id, 'physical', c.display_group, 0, true, v_admin_id FROM categories c WHERE c.slug = 'lavender-seedlings';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'lavanda-hidkot', 'Лаванда Хідкот', 'Компактний сорт із темно-фіолетовими квітами', 150, '/frontend/IMG/lavender__hydr.png', NULL, 'Саджанець лаванди Хідкот', c.id, 'physical', c.display_group, 1, true, v_admin_id FROM categories c WHERE c.slug = 'lavender-seedlings';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'angliyska-troianda', 'Англійська троянда', 'Пишні ароматні квіти з тривалим періодом цвітіння', 220, '/frontend/IMG/lavender__hydr.png', NULL, 'Саджанець англійської троянди', c.id, 'physical', c.display_group, 0, true, v_admin_id FROM categories c WHERE c.slug = 'rose-seedlings';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'parkova-troianda', 'Паркова троянда', 'Невибагливий морозостійкий сорт для садових композицій', 180, '/frontend/IMG/lavender__hydr.png', NULL, 'Саджанець паркової троянди', c.id, 'physical', c.display_group, 1, true, v_admin_id FROM categories c WHERE c.slug = 'rose-seedlings';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'miskantus', 'Міскантус', 'Висока декоративна трава з повітряними суцвіттями', 160, '/frontend/IMG/lavender__hydr.png', NULL, 'Саджанець міскантусу', c.id, 'physical', c.display_group, 0, true, v_admin_id FROM categories c WHERE c.slug = 'ornamental-grasses';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'kovyla', 'Ковила', 'Легка декоративна трава для природних садових композицій', 100, '/frontend/IMG/lavender__hydr.png', NULL, 'Саджанець ковили', c.id, 'physical', c.display_group, 1, true, v_admin_id FROM categories c WHERE c.slug = 'ornamental-grasses';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'tuia-smarahd', 'Туя Смарагд', 'Вічнозелена компактна туя з густою кроною', 250, '/frontend/IMG/lavender__hydr.png', NULL, 'Саджанець туї Смарагд', c.id, 'physical', c.display_group, 0, true, v_admin_id FROM categories c WHERE c.slug = 'conifer-seedlings';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'yalivets', 'Ялівець', 'Невибаглива хвойна рослина для декоративних композицій', 200, '/frontend/IMG/lavender__hydr.png', NULL, 'Саджанець ялівцю', c.id, 'physical', c.display_group, 1, true, v_admin_id FROM categories c WHERE c.slug = 'conifer-seedlings';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'hortenziia', 'Гортензія', 'Декоративний кущ із великими пишними суцвіттями', 240, '/frontend/IMG/lavender__hydr.png', NULL, 'Саджанець гортензії', c.id, 'physical', c.display_group, 0, true, v_admin_id FROM categories c WHERE c.slug = 'shrub-seedlings';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'spireia', 'Спірея', 'Компактний квітучий кущ, невибагливий у догляді', 170, '/frontend/IMG/lavender__hydr.png', NULL, 'Саджанець спіреї', c.id, 'physical', c.display_group, 1, true, v_admin_id FROM categories c WHERE c.slug = 'shrub-seedlings';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'ekhinatseia', 'Ехінацея', 'Яскрава багаторічна рослина з тривалим літнім цвітінням', 110, '/frontend/IMG/lavender__hydr.png', NULL, 'Саджанець ехінацеї', c.id, 'physical', c.display_group, 0, true, v_admin_id FROM categories c WHERE c.slug = 'perennial-flowers';
    INSERT INTO products (slug, title, description, price, image_url, icon_url, alt, category_id, product_type, display_group, sort_order, is_active, created_by_admin_id) SELECT 'shavliia', 'Шавлія', 'Ароматний багаторічник із декоративними фіолетовими суцвіттями', 90, '/frontend/IMG/lavender__hydr.png', NULL, 'Саджанець шавлії', c.id, 'physical', c.display_group, 1, true, v_admin_id FROM categories c WHERE c.slug = 'perennial-flowers';

    -- ==========================================================
    -- PRODUCTS: квитки (2) — БЕЗ категорії (category_id = NULL)
    -- ==========================================================
    INSERT INTO products (slug, title, description, price, image_url, category_id, product_type, pricing_mode, display_group, sort_order, is_active, created_by_admin_id) VALUES ('dennyi-kvytok', 'Денний квиток', 'Денні загальні відвідування', 200, '/frontend/IMG/Layer 3.png', NULL, 'ticket', 'person', 'products', 0, true, v_admin_id);
    INSERT INTO products (slug, title, description, price, image_url, category_id, product_type, pricing_mode, display_group, sort_order, is_active, created_by_admin_id) VALUES ('vechirniy-kvytok', 'Вечірній квиток', 'Індивідуальне відвідування', 500, '/frontend/IMG/Layer 2.png', NULL, 'ticket', 'hour', 'products', 1, true, v_admin_id);

    RAISE NOTICE 'Сідинг завершено.';
END $$;

COMMIT;


-- ============================================================
-- ЧАСТИНА 4: ПЕРЕВІРКИ
-- ============================================================

-- 1. Кількість категорій (очікується 13)
SELECT count(*) AS categories_count FROM categories;

-- 2. Кількість реальних товарів (очікується 18)
SELECT count(*) AS physical_products_count FROM products WHERE product_type = 'physical';

-- 3. Кількість квитків (очікується 2)
SELECT count(*) AS ticket_products_count FROM products WHERE product_type = 'ticket';

-- 4. Товари типу physical БЕЗ category_id (очікується 0)
SELECT count(*) AS physical_products_without_category
FROM products
WHERE product_type = 'physical' AND category_id IS NULL;

-- 5. Некоректні посилання category_id (очікується 0 — неможливо через FK, перевірка для повноти)
SELECT count(*) AS invalid_category_refs
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.category_id IS NOT NULL AND c.id IS NULL;

-- 6. Дублікати sort_order категорій у межах display_group (очікується 0 рядків)
SELECT display_group, sort_order, count(*)
FROM categories
GROUP BY display_group, sort_order
HAVING count(*) > 1;

-- 7. Розподіл реальних товарів по категоріях
SELECT category_id, count(*)
FROM products
WHERE product_type = 'physical'
GROUP BY category_id
ORDER BY category_id;

-- 8. Повний перелік категорій з кількістю товарів у кожній (наочна звірка)
SELECT
    c.id, c.slug, c.name, c.display_group, c.sort_order,
    count(p.id) FILTER (WHERE p.product_type = 'physical') AS products_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.slug, c.name, c.display_group, c.sort_order
ORDER BY c.display_group, c.sort_order;
