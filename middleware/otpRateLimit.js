// otpRateLimiters.js

/** ---------------------------
 *  GLOBAL OTP RATE LIMITER
 *  ---------------------------
 */

// Total OTP allowed per hour server-wide
const GLOBAL_OTP_LIMIT = 100;
const GLOBAL_WINDOW = 60 * 60 * 1000; // 1 hour

let globalOtpCount = 0;
let globalWindowStart = Date.now();

const otpGlobalRateLimiter = (req, res, next) => {
  const now = Date.now();

  // Reset global window every hour
  if (now - globalWindowStart >= GLOBAL_WINDOW) {
    globalOtpCount = 0;
    globalWindowStart = now;
  }

  if (globalOtpCount >= GLOBAL_OTP_LIMIT) {
    return res.status(429).json({
      success: false,
      message: "OTP service limit reached (global). Try again in 1 hour.",
    });
  }

  globalOtpCount++;
  next();
};



/** ---------------------------
 *  USER-SPECIFIC OTP LIMITER
 *  ---------------------------
 */

// Max OTP per user within 5 minutes
const USER_OTP_LIMIT = 5;
const USER_WINDOW = 5 * 60 * 1000; // 5 minutes

// Store user request counts
// Structure: { "userIdentifier": { count: number, startTime: timestamp } }
const userOtpData = {};

const otpUserRateLimiter = (req, res, next) => {
  // Identify user using phone number, email or unique ID
  const userId = req.body.phone || req.query.phone || req.ip;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User identifier (phone) is required.",
    });
  }

  const now = Date.now();

  // Initialize data for new user
  if (!userOtpData[userId]) {
    userOtpData[userId] = { count: 0, startTime: now };
  }

  const userData = userOtpData[userId];

  // Reset window if 5 minutes passed
  if (now - userData.startTime >= USER_WINDOW) {
    userData.count = 0;
    userData.startTime = now;
  }

  // Check if limit exceeded
  if (userData.count >= USER_OTP_LIMIT) {
    return res.status(429).json({
      success: false,
      message: "Too many OTP requests. Try again in 5 minutes.",
    });
  }

  // Allow + increment
  userData.count++;

  next();
};



/** ---------------------------
 *  EXPORT BOTH LIMITERS
 *  ---------------------------
 */

module.exports = {
  otpGlobalRateLimiter,
  otpUserRateLimiter,
};
