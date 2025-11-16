const { User, BankDetails } = require("../models/index");
const passport = require("passport");

// Async wrapper to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
// =========================
// ✅ USER SIGNUP (OTP FIRST → CREATE USER LATER)
// =========================
exports.new = asyncHandler(async (req, res) => {
  const { name, email, number, membershipType, plan, shift, password } = req.body;

  if (!name || !number || !membershipType || !plan || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const existingUser = await User.findOne({ number });
  if (existingUser) {
    return res
      .status(400)
      .json({ success: false, message: "User already exists" });
  }

  // ✅ Generate OTP first (before creating user)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const response = await fetch(
    `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: `+91${number}`,
        type: "text",
        text: { body: `Your OTP is ${otp}` },
      }),
    }
  );

  const apiRes = await response.json();
  console.log("WhatsApp API Response:", apiRes);

  // ❌ If OTP fails → DO NOT CREATE USER
  if (apiRes.error) {
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
      error: apiRes.error,
    });
  }

  // ✅ OTP delivered successfully → NOW create the user
  const newUser = new User({
    name,
    email,
    number,
    membershipType,
    plan,
    shift,
    otp,
    otpExpires: Date.now() + 5 * 60 * 1000,
    isVerified: false,
  });

  await User.register(newUser, password);

  res.status(200).json({
    success: true,
    message: "OTP sent successfully. Please verify to complete signup.",
    userId: newUser._id,
  });
});

// =========================
// ✅ VERIFY OTP + AUTO LOGIN
// =========================
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { number, otp } = req.body;

  const user = await User.findOne({ number });
  if (!user)
    return res.status(400).json({ success: false, message: "User not found" });

  if (user.otp !== otp)
    return res
      .status(400)
      .json({ success: false, message: "Invalid OTP" });

  if (user.otpExpires < Date.now())
    return res
      .status(400)
      .json({ success: false, message: "OTP expired" });

  // ✅ Verify user
  user.isVerified = true;
  user.otp = null;
  user.otpExpires = null;
  await user.save();

  // ✅ Login session
  req.login(user, (err) => {
    if (err)
      return res
        .status(500)
        .json({ success: false, message: "Login failed" });

    res.json({
      success: true,
      message: "OTP verified successfully. Logged in.",
    });
  });
});

// =========================
// ✅ LOGIN (BLOCK IF OTP NOT VERIFIED)
// =========================
exports.login = asyncHandler(async (req, res, next) => {
  passport.authenticate("user-local", async (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: info?.message || "Invalid number or password",
      });
    }

    // ✅ Block login until OTP is verified
    if (!user.isVerified) {
          // resend OTP and block login
          return res.status(403).json({
              success: false,
              message: "Account not verified. OTP resent.",
              redirect: `/verify-otp?number=${user.number}`,
                                      });
                            }


    req.login(user, (err) => {
      if (err) return next(err);

      res.status(200).json({
        success: true,
        message: "Login successful",
        user: {
          _id: user._id,
          name: user.name,
          number: user.number,
          membershipType: user.membershipType,
          plan: user.plan,
          shift: user.shift,
        },
      });
    });
  })(req, res, next);
});

exports.resendOtp = asyncHandler(async (req, res) => {
  const { number } = req.body;

  const user = await User.findOne({ number });
  if (!user)
    return res.status(400).json({ success: false, message: "User not found" });

  // ✅ Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otpExpires = Date.now() + 5 * 60 * 1000;
  await user.save();

  // ✅ Send again to WhatsApp
  const response = await fetch(
    `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: `+91${number}`,
        type: "text",
        text: { body: `Your OTP is ${otp}` },
      }),
    }
  );

  const apiRes = await response.json();
  if (apiRes.error)
    return res.status(500).json({ success: false, message: "Failed to resend OTP" });

  res.json({ success: true, message: "OTP resent successfully" });
});


// =========================
// ✅ USER PROFILE
// =========================
exports.userProfile = asyncHandler(async (req, res) => {
  if (!req.isAuthenticated()) {
    return res
      .status(401)
      .json({ success: false, message: "Not logged in" });
  }

  const user = await User.findById(req.user._id)
    .select("-hash -salt -__v")
    .populate("seat");

  res.status(200).json({ success: true, user });
});

// =========================
// ✅ LOGOUT
// =========================
exports.userLogout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ success: true, message: "Logged out successfully" });
  });
};

// =========================
// ✅ CHECK LOGIN STATUS
// =========================
exports.check = (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({
      loggedIn: true,
      userId: req.user._id,
      name: req.user.name,
    });
  }
  res.json({ loggedIn: false });
};

// =========================
// ✅ PROFILE PIC UPDATE
// =========================
exports.updateProfilePic = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "Please upload an image!" });
  }

  const user = req.user;

  // Delete old photo
  if (user.profilePic && !user.profilePic.includes("default-avatar")) {
    try {
      const publicId = user.profilePic.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`profile_photos/${publicId}`);
    } catch {}
  }

  user.profilePic = req.file.path;
  await user.save();

  res.json({
    success: true,
    message: "Profile picture updated successfully!",
    imageUrl: req.file.path,
  });
});

// =========================
// ✅ BANK DETAILS
// =========================
exports.bank = asyncHandler(async (req, res) => {
  const { accountHolder, upiMobile, plan, amount } = req.body;

  if (!accountHolder || !upiMobile || !plan || !amount) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const bankDetails = new BankDetails({
    user: req.user._id,
    accountHolder,
    upiMobile,
    plan,
    amount,
  });

  await bankDetails.save();

  res.json({
    success: true,
    message: "Bank details submitted successfully!",
  });
});
