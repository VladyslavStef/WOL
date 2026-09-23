require("dotenv").config();
const express = require("express");
const cors = require("cors");        // FIX: added — needed if frontend runs on a different origin
const helmet = require("helmet");    // FIX: added — sets sane security headers by default
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("DB_PASSWORD існує:", typeof process.env.DB_PASSWORD);

// FIX (SECURITY — rate limiting correctness): без цього, за реверс-
// проксі (типова production-конфігурація), req.ip показував би IP
// самого проксі для ВСІХ запитів одразу — rate-limit по IP (middleware/
// rateLimit.js) рахував би всіх користувачів як одного. На localhost
// без проксі ця опція нешкідлива і нічого не змінює.
app.set("trust proxy", 1);

// Глобальні посередники (Middleware)
app.use(helmet());

// FIX (SECURITY — CORS): раніше cors() без опцій дозволяв запити з
// БУДЬ-ЯКОГО origin. Якщо FRONTEND_ORIGIN не заданий (як зараз,
// локально) — поведінка НЕ змінюється (dev-регресії немає). У
// продакшн обов'язково задати реальний домен(и) фронтенду через
// FRONTEND_ORIGIN (через кому, якщо кілька — напр. з www і без).
// credentials НЕ вмикається — токен передається через Authorization-
// заголовок, а не cookie, тож credentials:true тут не потрібен.
const corsOrigin = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim())
    : true;
app.use(cors({ origin: corsOrigin }));

app.use(express.json());

// Базовий тестовий маршрут
app.get("/", (req, res) => {
    res.send("Wonder of Lavender backend працює з NODEMON");
});

// Підключення модульних маршрутів
app.use("/booking", bookingRoutes);

app.use("/products", require("./routes/productRoutes"));
app.use("/categories", require("./routes/categoryRoutes"));
app.use("/orders", require("./routes/orderRoutes"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/settings", require("./routes/settingsRoutes"));

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});