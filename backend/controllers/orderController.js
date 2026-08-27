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
    // Спочатку дістаємо всі замовлення з бази (від найновіших до найстаріших)
    const ordersRes = await pool.query(
      "SELECT * FROM orders ORDER BY id DESC;",
    );
    const orders = ordersRes.rows;

    // FIX: замінили N+1 запитів (один SELECT на кожне замовлення) на єдиний
    // запит з ANY($1), що набагато швидше при великій кількості замовлень.
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

    let total_price = 0;
    const verifiedItems = [];

    // --- Крок B: Перевірка цін та залишків на складі на бекенді ---
    for (const item of items) {
      const { product_id, quantity } = item;

      if (!product_id || !quantity || quantity <= 0) {
        throw new Error("Некоректні дані товару або кількості в кошику");
      }

      // Запит до бази за актуальною ціною, назвою та залишками
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

      // Перевірка складу для фізичних товарів
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

      // Зберігаємо перевірені дані для подальшого запису
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
      // Записуємо товар у чек
      await client.query(itemInsertQuery, [
        orderId,
        item.product_id,
        item.quantity,
        item.price_per_item,
        item.product_title,
      ]);

      // Якщо товар фізичний — списуємо кількість зі складу
      if (item.product_type === "physical") {
        await client.query(
          "UPDATE products SET stock = stock - $1 WHERE id = $2",
          [item.quantity, item.product_id],
        );
      }
    }

    // Фіксуємо транзакцію назавжди, якщо все пройшло без помилок
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
    // Обов'язково звільняємо клієнта назад у пул підключень
    client.release();
  }
};

// ==========================================
// 3. UPDATE: Зміна статусу замовлення (Адмінка)
// ==========================================
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params; // Отримуємо ID замовлення з URL-адреси
  const { status, payment_status } = req.body; // Отримуємо нові статуси з форми

  // --- ПЕРЕВІРКА 1: Чи ввів адмін правильний статус (відповідно до CHECK в БД) ---
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
    // --- ПЕРЕВІРКА 2: Чи існує замовлення з таким ID в базі даних ---
    const orderCheck = await pool.query("SELECT * FROM orders WHERE id = $1", [
      id,
    ]);

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Замовлення з таким ID не знайдено в системі",
      });
    }

    // Оновлюємо дані. Якщо якесь поле не передали з форми, залишаємо старе з бази
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
