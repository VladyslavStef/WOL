require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

const frontend = path.resolve(__dirname, "../frontend");

app.use("/frontend", express.static(frontend));
app.use(express.static(frontend));

app.get(["/", "/main.html"], (req, res) => {
  res.sendFile(path.join(frontend, "HTML", "main.html"));
});

app.get("/catalogue.html", (req, res) => {
  res.sendFile(path.join(frontend, "HTML", "catalogue.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(frontend, "admin", "admin.html"));
});

    if (frontend) {
        app.use(express.static(frontend));
        app.use("/frontend", express.static(frontend));
      
        app.get(["/", "/main.html"], (req, res) => {
          res.sendFile(path.join(frontend, "HTML", "main.html"));
        });
      
        app.get("/catalogue.html", (req, res) => {
          res.sendFile(path.join(frontend, "HTML", "catalogue.html"));
        });
      
        app.get("/admin.html", (req, res) => {
          res.sendFile(path.join(frontend, "admin", "admin.html"));
        });
      }

app.use(helmet());
const corsOrigin = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim())
    : true;
app.use(cors({ origin: corsOrigin }));
app.set("trust proxy", 1);

app.use(express.json());

// Health-check переїхав з "/", щоб не конфліктувати з роздачею фронтенду.
app.get("/api/health", (req, res) => {
    res.json({ success: true, message: "Wonder of Lavender backend працює" });
});

app.use("/booking", bookingRoutes);
app.use("/products", require("./routes/productRoutes"));
app.use("/categories", require("./routes/categoryRoutes"));
app.use("/orders", require("./routes/orderRoutes"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/settings", require("./routes/settingsRoutes"));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://w.behold.so"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// 404 — жоден із попередніх маршрутів/статики не підійшов.
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Маршрут не знайдено" });
});

// Страхувальна сітка: ловить усе, що не було оброблено власним try/catch
// контролера (наприклад, кривий JSON у тілі запиту від express.json()).
app.use((err, req, res, next) => {
    console.error("Необроблена помилка сервера:", err);
    res.status(err.status || 500).json({
        success: false,
        message: "Внутрішня помилка сервера. Спробуйте пізніше."
    });
});

app.listen(PORT, "0.0.0.0", () =>
 { console.log(`Server started on port ${PORT}`);
 });
