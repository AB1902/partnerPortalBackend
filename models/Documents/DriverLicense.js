const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  documentS3Link: { type: String },
  key: { type: String },
  userId: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  expirationDate: { type: String, required: true },
  issueDate: { type: String, required: true },
});

module.exports = mongoose.model("DriverLicense", schema);
