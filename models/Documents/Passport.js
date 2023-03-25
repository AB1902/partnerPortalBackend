const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  documentS3Link: { type: String },
  userId: { type: String, required: true },
  country: { type: String, required: true },
  key: { type: String },
  expirationDate: { type: String },
  issueDate: { type: String },
  contentType: { type: String },
});

module.exports = mongoose.model("Passport", schema);
