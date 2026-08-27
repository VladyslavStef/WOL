const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// FIX: fail loudly at startup if JWT_SECRET is missing, instead of silently
// falling back to a hardcoded public string that would let anyone forge tokens.
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET не встановлено у .env. Додайте змінну середовища JWT_SECRET.");
}

// ==========================================
// LOG IN: Вхід в адмін-панель за Name та Паролем
// ==========================================
exports.login = async (req, res) => {
    const { name, password } = req.body;

    // Крок 1: Перевірка на порожні дані
    if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ success: false, message: "Введіть логін (name)" });
    }
    if (!password || typeof password !== "string" || !password.trim()) {
        return res.status(400).json({ success: false, message: "Введіть пароль" });
    }

    try {
        // Крок 2: Пошук адміністратора в базі за іменем
        const adminRes = await pool.query('SELECT * FROM admin WHERE name = $1', [name.trim()]);

        if (adminRes.rows.length === 0) {
            // Безпека: не кажемо конкретно "логін невірний", щоб хакер не вгадав логін
            return res.status(401).json({ success: false, message: "Неправильний логін або пароль" });
        }

        const admin = adminRes.rows[0];

        // Крок 3: Перевірка пароля через bcryptjs
        const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Неправильний логін або пароль" });
        }

        // Крок 4: Створення JWT-токена (діє 12 годин)
        const token = jwt.sign(
            { id: admin.id, name: admin.name },
            process.env.JWT_SECRET,
            { expiresIn: "12h" }
        );

        // Повертаємо токен та дані адміна на фронтенд
        // FIX: removed `email: admin.email` — there is no `email` column on the
        // admin table, so this was always returning `undefined`.
        return res.status(200).json({
            success: true,
            message: "Вхід успішний",
            token,
            admin: {
                id: admin.id,
                name: admin.name
            }
        });

    } catch (error) {
        console.error("Помилка авторизації:", error.message);
        return res.status(500).json({ success: false, message: "Внутрішня помилка сервера при вході" });
    }
};
