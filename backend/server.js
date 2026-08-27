require("dotenv").config();
const express = require("express");
const cors = require("cors");        // FIX: added — needed if frontend runs on a different origin
const helmet = require("helmet");    // FIX: added — sets sane security headers by default
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("DB_PASSWORD існує:", typeof process.env.DB_PASSWORD);

// Глобальні посередники (Middleware)
app.use(helmet());
app.use(cors());
app.use(express.json());

// Базовий тестовий маршрут
app.get("/", (req, res) => {
    res.send("Wonder of Lavender backend працює з NODEMON");
});

// Підключення модульних маршрутів
app.use("/booking", bookingRoutes);

app.use("/products", require("./routes/productRoutes"));
app.use("/orders", require("./routes/orderRoutes"));
app.use("/auth", require("./routes/authRoutes"));

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
