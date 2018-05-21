const mongoose = require("mongoose");
const User = require("./User");
const SUBJECTS = require("./_subjects");

//Validators
const subjectValidate = function(value) {
  if (value.length == 0) {
    return false;
  }
  return value.every(x => Object.keys(SUBJECTS).includes(x));
};

//not being used right now
const pictureValidate = [
  {
    validator: function(v) {
      return validator.isURL(v);
    },
    message: "Picture didn't work",
    isAsync: false
  }
];

//Schema
const TutorSchema = new mongoose.Schema(
  {
    tutor: { type: Boolean, default: true },
    subjects: {
      type: Array,
      validate: {
        validator: subjectValidate,
        message: "Select one subject from avialble subjects"
      }
    },
    ratings: { type: Array, default: [] },
    picture: { type: String, default: "/images/default_profile_pic.jpg" },
    college: { type: String, validate: { validator: () => true } },
    languages: { type: Array, validate: { validator: () => true } },
    price: { type: Number, default: 40 },
    status: { type: String, default: "offline" }
  },
  { discriminatorKey: "kind" }
);

TutorSchema.methods.setStatus = async function(word) {
  this.status = word;
  await this.save();
};

module.exports = User.discriminator("Tutor", TutorSchema);
