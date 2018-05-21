const mongoose = require("mongoose"),
  Schema = mongoose.Schema;

const statuses = ["pending", "insession", "finished"];

const TutorSessionSchema = new mongoose.Schema(
  {
    tutor_id: { type: String, required: true },
    user_id: { type: String, required: true },
    price: Number,
    status: { type: String, enum: statuses },
    duration: { type: Number, required: true },
    startTime: { type: Date },
    endTime: { type: Date },
    stripeToken: { type: String}
  },
  { timestamps: true }
);

TutorSessionSchema.methods.setStatus = async function(word) {
  if (statuses.includes(word)) {
    this.status = word;
    await this.save();
  } else {
    throw new Error("incorrect status value for tutorsessoin");
  }
};

TutorSessionSchema.statics.isInSession = async function(user_id, tutor_id) {
  return this.findOne({ user_id, tutor_id, status: "insession" });
};

module.exports = mongoose.model("TutorSession", TutorSessionSchema);
