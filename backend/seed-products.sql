-- Переносить увесь захардкоджений каталог із product-data.js у таблицю products.
-- Виконати ОДИН РАЗ (після того, як застосував display_group міграцію і маєш
-- хоча б одного адміна в таблиці admin).
--
-- Ціни для товарів без чіткого priceValue у старому product-data.js (тобто
-- "від X грн" картки-заглушки та ВСІ саджанці — там priceValue взагалі не було
-- прописано в оригінальному коді, через що кошик показував "NaN грн" для
-- саджанців) тут отримують реальне число, щоб кошик рахував коректно.

DO $$
DECLARE
    v_admin_id BIGINT;
BEGIN
    SELECT id INTO v_admin_id FROM admin ORDER BY id LIMIT 1;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Немає жодного рядка в таблиці admin. Спочатку створи адміна.';
    END IF;

    -- ==========================================================
    -- PRODUCTS: hydrolats
    -- ==========================================================
    INSERT INTO products (slug, title, description, price, image_url, icon_url, category, display_group, product_type, sort_order, is_active, created_by_admin_id) VALUES
    ('hidrolaty', 'Гідролати', '(100г)', 100, '/frontend/IMG/lavender__title.png', NULL, 'hydrolats', 'products', 'physical', 0, true, v_admin_id),
    ('hidrolat-lavandy', 'Гідролат Лаванди', 'Для обличчя та тіла (100 г)', 125, '/frontend/IMG/lavender__hydr.png', '/frontend/IMG/hidr_lav.png', 'hydrolats', 'products', 'physical', 1, true, v_admin_id),
    ('hidrolat-kropyvy', 'Гідролат Кропиви', 'Звужує пори та знімає запалення', 150, '/frontend/IMG/kropyva__hydr.png', '/frontend/IMG/hidr_krop.png', 'hydrolats', 'products', 'physical', 2, true, v_admin_id),
    ('hidrolat-chystotilu', 'Гідролат Чистотілу', 'Для лиця та тіла', 150, '/frontend/IMG/chystotil__hydr.png', '/frontend/IMG/hidr_chys.png', 'hydrolats', 'products', 'physical', 3, true, v_admin_id);

    -- ==========================================================
    -- PRODUCTS: oils (лише одна картка в оригіналі)
    -- ==========================================================
    INSERT INTO products (slug, title, description, price, image_url, icon_url, category, display_group, product_type, sort_order, is_active, created_by_admin_id) VALUES
    ('olii', 'Олії', '(5 мг)', 250, '/frontend/IMG/oil.png', NULL, 'oils', 'products', 'physical', 0, true, v_admin_id);

    -- ==========================================================
    -- PRODUCTS: soaps
    -- ==========================================================
    INSERT INTO products (slug, title, description, price, image_url, icon_url, category, display_group, product_type, sort_order, is_active, created_by_admin_id) VALUES
    ('myla', 'Мила', '(100 г)', 150, '/frontend/IMG/soap_big.png', NULL, 'soaps', 'products', 'physical', 0, true, v_admin_id),
    ('malenke-mylo', 'Маленьке Мило', 'Для обличчя та тіла (100 г)', 125, '/frontend/IMG/soap_small.png', NULL, 'soaps', 'products', 'physical', 1, true, v_admin_id),
    ('velyke-mylo', 'Велике Мило', 'Для обличчя та тіла (100 г)', 150, '/frontend/IMG/soap_big.png', NULL, 'soaps', 'products', 'physical', 2, true, v_admin_id);

    -- ==========================================================
    -- PRODUCTS: tea, honey, bouquettes, candles
    -- ==========================================================
    INSERT INTO products (slug, title, description, price, image_url, icon_url, category, display_group, product_type, sort_order, is_active, created_by_admin_id) VALUES
    ('chai', 'Чаї', '(100г)', 100, '/frontend/IMG/teas.png', NULL, 'tea', 'products', 'physical', 0, true, v_admin_id),
    ('medy', 'Меди', '(100г)', 100, '/frontend/IMG/honey.jpg', NULL, 'honey', 'products', 'physical', 0, true, v_admin_id),
    ('buket', 'Букети', '', 100, '/frontend/IMG/bouquettes.png', NULL, 'bouquettes', 'products', 'physical', 0, true, v_admin_id),
    ('buket-lavandy', 'Букет Лаванди', 'Букетик карпатської лаванди', 100, '/frontend/IMG/bouquette.png', NULL, 'bouquettes', 'products', 'physical', 1, true, v_admin_id),
    ('svichky', 'Свічки', '(80г)', 100, '/frontend/IMG/candle.png', NULL, 'candles', 'products', 'physical', 0, true, v_admin_id);

    -- ==========================================================
    -- SEEDLINGS: lavender / rose / grasses / conifer / shrub / perennial
    -- ==========================================================
    INSERT INTO products (slug, title, description, price, image_url, icon_url, category, display_group, product_type, sort_order, is_active, created_by_admin_id) VALUES
    ('lavanda', 'Лаванда', 'Ароматні саджанці лаванди для саду та ландшафтного оформлення', 120, '/frontend/IMG/lavender_surprise.png', NULL, 'lavender-seedlings', 'seedlings', 'physical', 0, true, v_admin_id),
    ('lavanda-syurpryz', 'Лаванда Сюрприз', 'Морозостійкий сорт із насиченим ароматом та фіолетовим цвітінням', 120, '/frontend/IMG/lavender__hydr.png', './images/icons/lavender.svg', 'lavender-seedlings', 'seedlings', 'physical', 1, true, v_admin_id),
    ('lavanda-hidkot', 'Лаванда Хідкот', 'Компактний сорт із темно-фіолетовими квітами', 150, '/frontend/IMG/lavender__hydr.png', './images/icons/lavender.svg', 'lavender-seedlings', 'seedlings', 'physical', 2, true, v_admin_id),

    ('troiandy', 'Троянди', 'Саджанці декоративних троянд для саду та клумб', 180, '/frontend/IMG/lavender_surprise.png', NULL, 'rose-seedlings', 'seedlings', 'physical', 0, true, v_admin_id),
    ('angliyska-troianda', 'Англійська троянда', 'Пишні ароматні квіти з тривалим періодом цвітіння', 220, '/frontend/IMG/lavender__hydr.png', './images/icons/rose.svg', 'rose-seedlings', 'seedlings', 'physical', 1, true, v_admin_id),
    ('parkova-troianda', 'Паркова троянда', 'Невибагливий морозостійкий сорт для садових композицій', 180, '/frontend/IMG/lavender__hydr.png', './images/icons/rose.svg', 'rose-seedlings', 'seedlings', 'physical', 2, true, v_admin_id),

    ('dekoratyvni-travy', 'Декоративні трави', 'Багаторічні трави для сучасного ландшафтного дизайну', 100, '/frontend/IMG/lavender_surprise.png', NULL, 'ornamental-grasses', 'seedlings', 'physical', 0, true, v_admin_id),
    ('miskantus', 'Міскантус', 'Висока декоративна трава з повітряними суцвіттями', 160, '/frontend/IMG/lavender__hydr.png', './images/icons/grass.svg', 'ornamental-grasses', 'seedlings', 'physical', 1, true, v_admin_id),
    ('kovyla', 'Ковила', 'Легка декоративна трава для природних садових композицій', 100, '/frontend/IMG/lavender__hydr.png', './images/icons/grass.svg', 'ornamental-grasses', 'seedlings', 'physical', 2, true, v_admin_id),

    ('khvoini-roslyny', 'Хвойні рослини', 'Вічнозелені саджанці для саду, живоплоту та композицій', 200, '/frontend/IMG/lavender_surprise.png', NULL, 'conifer-seedlings', 'seedlings', 'physical', 0, true, v_admin_id),
    ('tuia-smarahd', 'Туя Смарагд', 'Вічнозелена компактна туя з густою кроною', 250, '/frontend/IMG/lavender__hydr.png', './images/icons/conifer.svg', 'conifer-seedlings', 'seedlings', 'physical', 1, true, v_admin_id),
    ('yalivets', 'Ялівець', 'Невибаглива хвойна рослина для декоративних композицій', 200, '/frontend/IMG/lavender__hydr.png', './images/icons/conifer.svg', 'conifer-seedlings', 'seedlings', 'physical', 2, true, v_admin_id),

    ('dekoratyvni-kushchi', 'Декоративні кущі', 'Квітучі та декоративні кущі для оформлення саду', 170, '/frontend/IMG/lavender_surprise.png', NULL, 'shrub-seedlings', 'seedlings', 'physical', 0, true, v_admin_id),
    ('hortenziia', 'Гортензія', 'Декоративний кущ із великими пишними суцвіттями', 240, '/frontend/IMG/lavender__hydr.png', './images/icons/shrub.svg', 'shrub-seedlings', 'seedlings', 'physical', 1, true, v_admin_id),
    ('spireia', 'Спірея', 'Компактний квітучий кущ, невибагливий у догляді', 170, '/frontend/IMG/lavender__hydr.png', './images/icons/shrub.svg', 'shrub-seedlings', 'seedlings', 'physical', 2, true, v_admin_id),

    ('bahatorichni-kvity', 'Багаторічні квіти', 'Квітучі багаторічники для клумб та садових композицій', 90, '/frontend/IMG/lavender_surprise.png', NULL, 'perennial-flowers', 'seedlings', 'physical', 0, true, v_admin_id),
    ('ekhinatseia', 'Ехінацея', 'Яскрава багаторічна рослина з тривалим літнім цвітінням', 110, '/frontend/IMG/lavender__hydr.png', './images/icons/flower.svg', 'perennial-flowers', 'seedlings', 'physical', 1, true, v_admin_id),
    ('shavliia', 'Шавлія', 'Ароматний багаторічник із декоративними фіолетовими суцвіттями', 90, '/frontend/IMG/lavender__hydr.png', './images/icons/flower.svg', 'perennial-flowers', 'seedlings', 'physical', 2, true, v_admin_id);

    INSERT INTO products (slug, title, description, price, image_url, icon_url, category, display_group, product_type, pricing_mode, sort_order, is_active, created_by_admin_id) VALUES
    ('dennyi-kvytok', 'Денний квиток', 'Денні загальні відвідування', 200, '/frontend/IMG/Layer 3.png', NULL, 'day-ticket', 'products', 'ticket', 'person', 0, true, v_admin_id),
    ('vechirniy-kvytok', 'Вечірній квиток', 'Індивідуальне відвідування', 500, '/frontend/IMG/Layer 2.png', NULL, 'evening-ticket', 'products', 'ticket', 'hour', 0, true, v_admin_id);

END $$;
