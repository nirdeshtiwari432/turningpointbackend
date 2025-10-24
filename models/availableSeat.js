const mongoose = require("../db");

const availableSeatSchema = new mongoose.Schema(
  {
    seatNo: { type: Number, required: true, unique: true },
    bookedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        shift: { type: String, enum: ["full_time", "morning", "night"], required: true },
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual
availableSeatSchema.virtual("isBooked").get(function () {
  return this.bookedBy.length > 0;
});

// Static method
availableSeatSchema.statics.bookSeat = async function (seatId, userId, shift) {
  const seat = await this.findById(seatId);
  if (!seat) throw new Error("Seat not found");

  // Full-time rules
  if (seat.bookedBy.some(u => u.shift === "full_time") && shift !== "full_time") {
    throw new Error("Seat is booked full-time");
  }
  if (shift === "full_time" && seat.bookedBy.length > 0) {
    throw new Error("Cannot book full-time, seat already has users");
  }

  // Prevent double booking in same shift
  if (seat.bookedBy.some(u => u.shift === shift)) {
    throw new Error(`Shift ${shift} is already booked`);
  }

  seat.bookedBy.push({ user: userId, shift });
  await seat.save();

  return seat;
};

// Static method to free a seat for a user
availableSeatSchema.statics.freeSeat = async function (seatId, userId) {
  const seat = await this.findById(seatId);
  if (!seat) throw new Error("Seat not found");

  seat.bookedBy = seat.bookedBy.filter(u => u.user.toString() !== userId.toString());
  await seat.save();
  return seat;
};

module.exports = mongoose.model("AvailableSeat", availableSeatSchema);
