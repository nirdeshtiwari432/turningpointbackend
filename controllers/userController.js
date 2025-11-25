const { User, BankDetails } = require("../models/index");
const passport = require("passport");
const cloudinary = require("cloudinary").v2;

// Async wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// =========================
// ✅ USER SIGNUP (NO OTP)
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

  const newUser = new User({
    name,
    email,
    number,
    membershipType,
    plan,
    shift,
    isVerified: true, // no otp system
  });

  await User.register(newUser, password);

  res.status(200).json({
    success: true,
    message: "Signup successful. You can now login.",
  });
});

// =========================
// ✅ LOGIN (NO OTP CHECK)
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

// =========================
// ❌ Removed verifyOtp
// ❌ Removed resendOtp
// =========================

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

  // Delete old Cloudinary image
  if (user.profilePic && !user.profilePic.includes("default-avatar")) {
    try {
      const parts = user.profilePic.split("/");
      const fileName = parts.pop().split(".")[0];
      const folder = parts.pop();

      const publicId = `${folder}/${fileName}`;
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error("Cloudinary delete error:", err.message);
    }
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
