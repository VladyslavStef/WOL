const jwt = require("jsonwebtoken");

// FIX: fail loudly if JWT_SECRET is missing rather than silently using a
// hardcoded public fallback that would let anyone forge valid admin tokens.
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET не встановлено у .env. Додайте змінну середовища JWT_SECRET.");
}

// Middleware для захисту адмін-маршрутів
module.exports = (req, res, next) => {
    // 1. Перевіряємо чи надіслано заголовок Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Доступ заборонено. Відсутній токен авторизації"
        });
    }

    // 2. Відрізаємо слово Bearer і забираємо чистий токен
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({
            success: false,
            message: "Помилка формату токена. Використовуйте 'Bearer <token>'"
        });
    }

    const token = parts[1];

    // 3. Звіряємо токен із нашим секретним ключем сервера
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        console.error("Помилка валідації токена:", error.message);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Термін дії токена закінчився. Будь ласка, увійдіть в систему знову"
            });
        }

        return res.status(403).json({
            success: false,
            message: "Недійсний токен авторизації. Доступ заблоковано"
        });
    }
};
