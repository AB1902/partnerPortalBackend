const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  documentS3Link: { type: String },
  key: { type: String },
  userId: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  expirationDate: { type: String },
  issueDate: { type: String },
  contentType: { type: String },
});

module.exports = mongoose.model("DriverLicense", schema);
