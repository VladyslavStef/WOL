require("dotenv").config();

cconst path =  require("path");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const bookingRoutes = require("./routes/bookingRoutes");

const app = express();
const PORT = process.env.PORT || 3000;
const forntend =  path.resolve(__dirname, "../fromtend");

console.log("DB_PASSWORD exists:", typeof process.env.DB_PASSWORD);

// This makes Express trust the reverse proxy IP when behind a proxy.
// Without it, rate limiting would count all requests as coming from the proxy.
app.set("trust proxy", 1);

// Global middleware
app.use(helmet());

const corsOrigin = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

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

// Mounted routes
app.use("/booking", bookingRoutes);
app.use("/products", require("./routes/productRoutes"));
app.use("/categories", require("./routes/categoryRoutes"));
app.use("/orders", require("./routes/orderRoutes"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/settings", require("./routes/settingsRoutes"));

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
