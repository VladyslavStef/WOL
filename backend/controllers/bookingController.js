const pool = require("../config/db");

const dayTimes = [
    "10:00–11:00", "11:00–12:00", "12:00–13:00", "13:00–14:00",
    "14:00–15:00", "15:00–16:00", "16:00–17:00", "17:00–18:00"
];

const eveningTimes = [
    "18:00–19:00", "19:00–20:00", "20:00–21:00"
];


const generateBookingCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `WOL-${randomPart}`;
};

exports.createBooking = async (req, res) => {
    console.log(req.body);

    const { 
        customer_name, 
        customer_phone, 
        product_id, 
        booking_date, 
        visitors, 
        ticket_id, 
        times 
    } = req.body;

    // --- 1. ВХІДНА ВАЛІДАЦІЯ ---
    if (!customer_name || typeof customer_name !== "string" || !customer_name.trim()) {
        return res.status(400).json({ success: false, message: "Введіть правильне ім'я" });
    }

    if (!customer_phone || typeof customer_phone !== "string" || !customer_phone.trim() || !/^(?:0\d{9}|\+380\d{9})$/.test(customer_phone.trim())) {
        return res.status(400).json({ success: false, message: "Введіть правильний номер телефону" });
    }

    if (!product_id) {
        return res.status(400).json({ success: false, message: "Неправильний ідентифікатор послуги" });
    }

    if (!Array.isArray(times) || times.length === 0 || times.length > 3) {
        return res.status(400).json({ success: false, message: "Оберіть від 1 до 3 часових проміжків" });
    }

    if (ticket_id !== "day" && ticket_id !== "evening") {
        return res.status(400).json({ success: false, message: "Вибрано неправильний тип квитка" });
    }

    // Приведення часу до рядків для валідації лімітів
    const timeStrings = times.map(t => typeof t === "string" ? t : `${t.start}–${t.end}`);
    
    if (ticket_id === "day" && !timeStrings.every(time => dayTimes.includes(time))) {
        return res.status(400).json({ success: false, message: "Неправильний час для денного квитка" });
    }
    
    if (ticket_id === "evening" && !timeStrings.every(time => eveningTimes.includes(time))) {
        return res.status(400).json({ success: false, message: "Неправильний час для вечірнього квитка" });
    }

    if (new Set(timeStrings).size < timeStrings.length) {
        return res.status(400).json({ success: false, message: "Не можна вибрати один і той самий часовий проміжок двічі" });
    }

    if (!booking_date || typeof booking_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(booking_date.trim())) {
        return res.status(400).json({ success: false, message: "Оберіть дату у правильному форматі (РРРР-ММ-ДД)" });
    }

    const dateTrimmed = booking_date.trim();
    const [year, month, day] = dateTrimmed.split("-").map(Number);
    const parsedDate = new Date(year, month - 1, day);

    if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day) {
        return res.status(400).json({ success: false, message: "Такої дати не існує" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);

    if (parsedDate < today) {
        return res.status(400).json({ success: false, message: "Не можна забронювати дату в минулому" });
    }

    if (!Number.isInteger(visitors) || visitors < 1 || visitors > 30) {
        return res.status(400).json({ success: false, message: "Кількість відвідувачів має бути цілим числом від 1 до 30" });
    }

    // --- 2. ОДЕРЖАННЯ ДАНИХ ТОВАРУ ТА РОЗРАХУНОК ЦІНИ ---
    let client = await pool.connect();
    try {
        // Перевіряємо чи існує такий квиток/продукт у базі даних
        const productRes = await client.query("SELECT title, price, pricing_mode FROM products WHERE id = $1 AND is_active = true", [product_id]);
        if (productRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Такий квиток або послугу не знайдено в системі" });
        }

        const product = productRes.rows[0];
        const ticket_price = Number(product.price);
        const pricing_mode = product.pricing_mode || (ticket_id === "day" ? "person" : "hour");
        
        // Автоматичний розрахунок фіналу
        let calculated_total = pricing_mode === "person" ? ticket_price * visitors : ticket_price * times.length;

        // Починаємо транзакцію
        await client.query("BEGIN");

        const bookingCode = generateBookingCode();

        // 1. Запис у головну таблицю BOOKINGS (враховуючи всі нові поля)
        const bookingQuery = `
            INSERT INTO bookings (
                booking_code, product_id, customer_name, customer_phone, 
                booking_date, visitors, product_title, ticket_price, 
                pricing_mode, total_price, currency, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'UAH', 'confirmed') 
            RETURNING id;
        `;
        const bookingValues = [
            bookingCode,
            product_id,
            customer_name.trim(),
            customer_phone.trim(),
            dateTrimmed,
            visitors,
            product.title, // Динамічно підтягуємо назву продукту з бази
            ticket_price,
            pricing_mode,
            calculated_total
        ];
        
        const bookingResult = await client.query(bookingQuery, bookingValues);
        const bookingId = bookingResult.rows[0].id; // Для BIGINT повертається рядок або число

        // 2. Запис у проміжну таблицю BOOKING_TIMES
        const timeQuery = `INSERT INTO booking_times (booking_id, start_time, end_time) VALUES ($1, $2, $3);`;
        for (const slot of times) {
            let start, end;
            if (typeof slot === "string") {
                [start, end] = slot.split("–");
            } else {
                start = slot.start;
                end = slot.end;
            }
            await client.query(timeQuery, [bookingId, start.trim(), end.trim()]);
        }

        // Завершуємо транзакцію
        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            message: "Бронювання успішно оформлено",
            booking_code: bookingCode,
            bookingId: bookingId
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Помилка виконання транзакції:", error.message);
        return res.status(500).json({ success: false, message: "Помилка сервера при збереженні бронювання" });
    } finally {
        client.release();
    }
};


// ==========================================
// PUBLIC: ЗАЙНЯТІ ДАТИ ДЛЯ КОНКРЕТНОГО КВИТКА
// ==========================================
// FIX: раніше зайнятість дат/часу була захардкоджена на фронтенді
// (Set із номерами днів місяця, без прив'язки до реальних бронювань).
// Тепер фронтенд запитує реальні зайняті дати для обраного квитка.
exports.getBusyDates = async (req, res) => {
    const { product_id } = req.query;

    if (!product_id) {
        return res.status(400).json({ success: false, message: "Не вказано product_id" });
    }

    try {
        const result = await pool.query(
            `SELECT DISTINCT booking_date
             FROM bookings
             WHERE product_id = $1 AND status != 'cancelled'`,
            [product_id]
        );

        const busyDates = result.rows.map((row) => {
            const date = new Date(row.booking_date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        });

        return res.status(200).json({ success: true, busyDates });

    } catch (error) {
        console.error("Помилка отримання зайнятих дат:", error.message);
        return res.status(500).json({ success: false, message: "Помилка сервера при перевірці дат" });
    }
};


// ==========================================
// ADMIN: СПИСОК УСІХ БРОНЮВАНЬ (з часовими слотами)
// ==========================================
exports.getAllBookings = async (req, res) => {
    try {
        const bookingsRes = await pool.query(
            "SELECT * FROM bookings ORDER BY id DESC;"
        );
        const bookings = bookingsRes.rows;

        if (bookings.length > 0) {
            const bookingIds = bookings.map((b) => b.id);
            const timesRes = await pool.query(
                `SELECT id, booking_id, start_time, end_time
                 FROM booking_times
                 WHERE booking_id = ANY($1::bigint[])
                 ORDER BY start_time ASC`,
                [bookingIds]
            );

            const timesByBookingId = {};
            for (const slot of timesRes.rows) {
                if (!timesByBookingId[slot.booking_id]) timesByBookingId[slot.booking_id] = [];
                timesByBookingId[slot.booking_id].push(slot);
            }

            for (const booking of bookings) {
                booking.times = timesByBookingId[booking.id] || [];
            }
        }

        return res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });

    } catch (error) {
        console.error("Помилка отримання бронювань адміном:", error.message);
        return res.status(500).json({ success: false, message: "Помилка сервера при завантаженні бронювань" });
    }
};


// ==========================================
// ADMIN: ВИДАЛЕННЯ БРОНЮВАННЯ (напр. тестових записів)
// ==========================================
exports.deleteBooking = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM bookings WHERE id = $1 RETURNING id",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Бронювання не знайдено" });
        }

        // booking_times видаляться автоматично через ON DELETE CASCADE

        return res.status(200).json({
            success: true,
            message: "Бронювання видалено"
        });

    } catch (error) {
        console.error("Помилка видалення бронювання:", error.message);
        return res.status(500).json({ success: false, message: "Внутрішня помилка сервера при видаленні" });
    }
};
