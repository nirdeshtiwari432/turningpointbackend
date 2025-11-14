// seedWithPasswords.js
require("dotenv").config();
const mongoose = require("mongoose");
const { User, Admin, AvailableSeat } = require("./models");

mongoose.set("strictQuery", false);

async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("✅ Connected to MongoDB Atlas");
}

async function clearCollections() {
  await Promise.all([
    User.deleteMany({}),
    Admin.deleteMany({}),
    AvailableSeat.deleteMany({})
  ]);
  console.log("🧹 Cleared Users, Admins, Seats");
}

async function seedData() {
  try {
    await connectDB();
    await clearCollections();

    // ✅ Insert 75 seats
    const seats = [];
    for (let i = 1; i <= 75; i++) {
      seats.push({
        seatNo: i,
        isBooked: false,
        timing: "full_time"
      });
    }

    await AvailableSeat.insertMany(seats);
    console.log("✅ 75 Seats Added");

    // ✅ Add 1 Admin
    const admin = new Admin({
      name: "Super Admin",
      mobile: "9999999999"
    });

    await Admin.register(admin, "admin123"); 
    console.log("✅ 1 Admin Added (mobile: 9999999999 / pass: admin123)");

    console.log("\n🎉 Seeding Completed Successfully Without Any Extra Data!");
  } catch (error) {
    console.error("❌ Seed Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB Disconnected");
  }
}

seedData();
