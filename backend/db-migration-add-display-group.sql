-- Виконати ОДИН РАЗ, якщо таблиця products вже існує (у тебе так і є).
-- Якщо ти створюєш базу з нуля з оновленого db.sql — цей файл не потрібен.

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS display_group TEXT NOT NULL DEFAULT 'products';

ALTER TABLE products
    ADD CONSTRAINT chk_products_display_group
    CHECK (display_group IN ('products', 'seedlings'));
