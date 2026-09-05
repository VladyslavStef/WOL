const pool = require("../config/db");

// Генерація коду замовлення під маску ^WOL-[A-Z0-9]{6}$

const generateOrderCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Без схожих символів (O, 0, I, 1)
  let randomPart = "";
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `WOL-${randomPart}`;
};

// ==========================================
// 1. READ: Отримання всіх замовлень з їхніми товарами (Адмінка)
// ==========================================
exports.getAllOrders = async (req, res) => {
  try {
    const ordersRes = await pool.query(
      "SELECT * FROM orders ORDER BY id DESC;",
    );
    const orders = ordersRes.rows;

    if (orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      const itemsRes = await pool.query(
        `SELECT id, order_id, product_id, quantity, price_per_item, product_title
                 FROM ordered_products
                 WHERE order_id = ANY($1::bigint[])`,
        [orderIds],
      );

      const itemsByOrderId = {};
      for (const item of itemsRes.rows) {
        if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
        itemsByOrderId[item.order_id].push(item);
      }

      for (const order of orders) {
        order.items = itemsByOrderId[order.id] || [];
      }
    }

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Помилка отримання замовлень адміном:", error.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Помилка сервера при завантаженні замовлень",
      });
  }
};

// ==========================================
// 2. CREATE: Оформлення нового замовлення (Клієнт)
// ==========================================
exports.createOrder = async (req, res) => {
  const { customer_name, customer_phone, payment_method, items } = req.body;

  // --- Крок А: Валідація вхідних даних ---
  if (
    !customer_name ||
    typeof customer_name !== "string" ||
    !customer_name.trim()
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Введіть правильне ім'я" });
  }

  if (
    !customer_phone ||
    typeof customer_phone !== "string" ||
    !customer_phone.trim() ||
    !/^(?:0\d{9}|\+380\d{9})$/.test(customer_phone.trim())
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Введіть правильний номер телефону" });
  }

  if (
    !payment_method ||
    typeof payment_method !== "string" ||
    !payment_method.trim()
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Оберіть спосіб оплати" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Кошик не може бути порожнім" });
  }

  // Відкриваємо ізольоване підключення для транзакції
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ------------------------------------------------------------
    // FIX (catalog_enabled): БЕКЕНД — остаточний захист від продажу
    // товарів каталогу, поки catalog_enabled = false. Це навмисно НЕ
    // те саме, що products.is_active/categories.is_active — це окремий,
    // глобальний бізнес-стан "магазин тимчасово не приймає нові
    // замовлення через каталог", який зберігається в site_settings.
    //
    // Перевірка виконується ПЕРШОЮ, всередині тієї самої транзакції, ще
    // до будь-якої роботи з товарами/stock — якщо каталог закрито,
    // жоден рядок в orders/ordered_products не створюється і жоден
    // stock не списується. Booking (bookings/booking_times) навмисно
    // НЕ зачіпається цією перевіркою — це окремий бізнес-процес
    // (відвідування поля), не завʼязаний на продаж товарів каталогу.
    // ------------------------------------------------------------
    const catalogStatusRes = await client.query(
      "SELECT catalog_enabled FROM site_settings WHERE id = 1",
    );

    const isCatalogEnabled =
      catalogStatusRes.rows.length === 0
        ? true // немає рядка (стара база без сідингу) — безпечний дефолт "відкрито"
        : catalogStatusRes.rows[0].catalog_enabled;

    if (!isCatalogEnabled) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        catalogClosed: true,
        message:
          "Каталог тимчасово закритий (сезонна перерва). Спробуйте, будь ласка, пізніше.",
      });
    }

    let total_price = 0;
    const verifiedItems = [];

    // --- Крок B: Перевірка цін та залишків на складі на бекенді ---
    for (const item of items) {
      const { product_id, quantity } = item;

      if (!product_id || !quantity || quantity <= 0) {
        throw new Error("Некоректні дані товару або кількості в кошику");
      }

      const productRes = await client.query(
        "SELECT title, price, stock, is_active, product_type FROM products WHERE id = $1",
        [product_id],
      );

      if (productRes.rows.length === 0) {
        throw new Error(`Товар з ID ${product_id} не знайдено в системі`);
      }

      const product = productRes.rows[0];

      if (!product.is_active) {
        throw new Error(
          `Товар "${product.title}" наразі недоступний для замовлення`,
        );
      }

      if (
        product.product_type === "physical" &&
        (product.stock === null || product.stock < quantity)
      ) {
        throw new Error(
          `Недостатньо товару "${product.title}" на складі. Доступно: ${product.stock || 0} шт.`,
        );
      }

      const itemPrice = Number(product.price);
      const itemCost = itemPrice * quantity;
      total_price += itemCost;

      verifiedItems.push({
        product_id,
        quantity,
        price_per_item: itemPrice,
        product_title: product.title,
        product_type: product.product_type,
      });
    }

    const orderCode = generateOrderCode();

    // --- Крок C: Запис у головну таблицю ORDERS ---
    const orderQuery = `
            INSERT INTO orders (order_code, customer_name, customer_phone, total_price, currency, status, payment_method, payment_status)
            VALUES ($1, $2, $3, $4, 'UAH', 'new', $5, 'unpaid')
            RETURNING id;
        `;
    const orderValues = [
      orderCode,
      customer_name.trim(),
      customer_phone.trim(),
      total_price,
      payment_method.trim(),
    ];
    const orderResult = await client.query(orderQuery, orderValues);
    const orderId = orderResult.rows[0].id;

    // --- Крок D: Запис у ORDERED_PRODUCTS та списування складу ---
    const itemInsertQuery = `
            INSERT INTO ordered_products (order_id, product_id, quantity, price_per_item, product_title)
            VALUES ($1, $2, $3, $4, $5);
        `;

    for (const item of verifiedItems) {
      await client.query(itemInsertQuery, [
        orderId,
        item.product_id,
        item.quantity,
        item.price_per_item,
        item.product_title,
      ]);

      // Атомарне умовне списання складу — закриває race condition при
      // одночасних замовленнях (два покупці на останню одиницю товару).
      if (item.product_type === "physical") {
        const stockUpdateRes = await client.query(
          `UPDATE products
                     SET stock = stock - $1
                     WHERE id = $2 AND stock >= $1
                     RETURNING stock`,
          [item.quantity, item.product_id],
        );

        if (stockUpdateRes.rows.length === 0) {
          throw new Error(
            `Товар "${item.product_title}" щойно розкупили — на складі вже недостатньо. Оновіть кошик і спробуйте ще раз.`,
          );
        }
      }
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Замовлення успішно оформлено",
      order_code: orderCode,
      orderId: orderId,
      total_price: total_price,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(
      "Помилка оформлення замовлення (Транзакція скасована):",
      error.message,
    );
    return res
      .status(400)
      .json({
        success: false,
        message: error.message || "Помилка сервера при оформленні замовлення",
      });
  } finally {
    client.release();
  }
};

// ==========================================
// 3. UPDATE: Зміна статусу замовлення (Адмінка)
// ==========================================
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, payment_status } = req.body;

  const allowedStatuses = [
    "new",
    "processing",
    "confirmed",
    "completed",
    "cancelled",
  ];

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message:
        "Недопустимий статус замовлення. Дозволено лише: " +
        allowedStatuses.join(", "),
    });
  }

  const allowedPaymentStatuses = [
    "unpaid",
    "pending",
    "paid",
    "failed",
    "refunded",
  ];
  if (payment_status && !allowedPaymentStatuses.includes(payment_status)) {
    return res.status(400).json({
      success: false,
      message:
        "Недопустимий статус оплати. Дозволено лише: " +
        allowedPaymentStatuses.join(", "),
    });
  }

  try {
    const orderCheck = await pool.query("SELECT * FROM orders WHERE id = $1", [
      id,
    ]);

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Замовлення з таким ID не знайдено в системі",
      });
    }

    const newStatus = status || orderCheck.rows[0].status;
    const newPaymentStatus =
      payment_status || orderCheck.rows[0].payment_status;

    const updateQuery = `
            UPDATE orders 
            SET status = $1, payment_status = $2 
            WHERE id = $3 
            RETURNING *;
        `;
    const result = await pool.query(updateQuery, [
      newStatus,
      newPaymentStatus,
      id,
    ]);

    return res.status(200).json({
      success: true,
      message: "Статус замовлення успішно оновлено",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Помилка оновлення статусу замовлення:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Внутрішня помилка сервера" });
  }
};
