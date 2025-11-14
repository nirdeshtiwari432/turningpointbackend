// otpGlobalRateLimiter.js

const OTP_LIMIT = 100; // total allowed per hour
const WINDOW = 60 * 60 * 1000; // 1 hour in ms

let globalOtpCount = 0;
let windowStart = Date.now();

const otpGlobalRateLimiter = (req, res, next) => {
  const now = Date.now();

  // ✅ If 1 hour passed → reset limit
  if (now - windowStart >= WINDOW) {
    globalOtpCount = 0;
    windowStart = now;
  }

  // ✅ If limit exceeded → block
  if (globalOtpCount >= OTP_LIMIT) {
    return res.status(429).json({
      success: false,
      message: "OTP service limit reached. Try again in 1 hour.",
    });
  }

  // ✅ Allow request + increment counter
  globalOtpCount++;

  next();
};

module.exports = otpGlobalRateLimiter;
