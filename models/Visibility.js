const mongoose = require("mongoose");

const visibilitySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  emergencyContacts: {
    type: Boolean,
    default: false,
  },
  medicalCondition: {
    type: Boolean,
    default: false,
  },
  medication: {
    type: Boolean,
    default: false,
  },
  allergy: {
    type: Boolean,
    default: false,
  },
  vaccine: {
    type: Boolean,
    default: false,
  },
  procedure: {
    type: Boolean,
    default: false,
  },
  insurance: {
    type: Boolean,
    default: false,
  },
  document: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Visibility", visibilitySchema);
