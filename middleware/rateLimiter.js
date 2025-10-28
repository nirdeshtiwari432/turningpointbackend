// middlewares/rateLimiter.js
const rateLimit = require("express-rate-limit");

// 🔒 General-purpose limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true, // Adds RateLimit-* headers
  legacyHeaders: false,
});

// 🔑 Stricter limiter for login or sensitive routes
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 5000, // 5 minute
  max: 5, // Limit to 5 login attempts per IP per minute
  message: {
    success: false,
    message: "Too many login attempts. Please try again after a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Export both
module.exports = {
  generalLimiter,
  loginLimiter,
};
