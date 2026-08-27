CREATE TABLE IF NOT EXISTS admin (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,              -- FIX: added UNIQUE, was missing (duplicate names broke login lookups)
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    category TEXT,
    product_type TEXT NOT NULL DEFAULT 'physical',
    pricing_mode TEXT,
    stock INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    -- NEW: чисто фронтенд-угруповання для перемикача "Наша продукція" / "Саджанці"
    -- на сторінці каталогу. category нижче використовується для під-групи
    -- (hydrolats, oils, soaps, tea, honey, bouquettes, candles, lavender-seedlings, ...)
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
    CONSTRAINT fk_products_created_by_admin FOREIGN KEY (created_by_admin_id) REFERENCES admin(id) ON DELETE RESTRICT,
    CONSTRAINT fk_products_updated_by_admin FOREIGN KEY (updated_by_admin_id) REFERENCES admin(id) ON DELETE SET NULL
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
    product_id BIGINT,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_per_item NUMERIC(10, 2) NOT NULL,
    product_title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_ordered_products_quantity CHECK (quantity > 0),
    CONSTRAINT chk_ordered_products_price CHECK (price_per_item >= 0),
    CONSTRAINT fk_ordered_products_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_ordered_products_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_code TEXT NOT NULL UNIQUE,
    product_id BIGINT,
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
    CONSTRAINT fk_bookings_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS booking_times (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_booking_times_range CHECK (start_time < end_time),
    CONSTRAINT uq_booking_times_slot UNIQUE (booking_id, start_time, end_time),
    CONSTRAINT fk_booking_times_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_by_admin ON products(created_by_admin_id);

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

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_updated_at ON admin;
CREATE TRIGGER trg_admin_updated_at BEFORE UPDATE ON admin FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON bookings;
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- FIX: the original INSERT stored the password as PLAIN TEXT in password_hash.
-- authController.js compares with bcrypt.compare(), which will ALWAYS fail against
-- a non-bcrypt string, so login could never succeed.
--
-- Do NOT insert the raw password here. Instead:
--   1. Run `node scripts/hashPassword.js "your-real-password"` (included alongside this file)
--   2. Copy the printed hash (starts with $2a$ or $2b$) into the line below
--
-- INSERT INTO admin (name, password_hash)
-- VALUES ('wonder_of_lavender', '$2a$10$PASTE_YOUR_GENERATED_HASH_HERE');
