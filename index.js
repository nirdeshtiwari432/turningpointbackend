const express = require("express");
const path = require("path");
const ejsMate = require("ejs-mate");
const ExpressError = require("./error");
const cors = require("cors");
const app = express();

// ===== CORS =====
app.use(
  cors({
    origin: ["https://turningpointvidisha.vercel.app", "http://localhost:5173"], // allow frontend
    credentials: true, // allow cookies
  })
);

// ===== Middleware =====
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===== View engine =====
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ===== Trust proxy =====
// Needed for secure cookies behind Render proxy
app.set("trust proxy", 1);

// ===== Sessions =====
require("./middleware/session")(app); // Make sure this file uses secure: true, sameSite: 'none'

// ===== Passport =====
require("./middleware/passport")(app); // After session middleware

// ===== Routes =====
const adminRoutes = require("./routes/admin");
const mainRoutes = require("./routes/main");
const userRoutes = require("./routes/user");

app.use("/", mainRoutes);
app.use("/admin", adminRoutes);
app.use("/user", userRoutes);

// ===== 404 handler =====
app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

// ===== Global error handler =====
app.use((err, req, res, next) => {
  const { status = 500, message = "Something went wrong" } = err;
  res.status(status).send(message);
});

// ===== Start server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
