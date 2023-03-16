const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  documentS3Link: { type: String },
  userId: { type: String, required: true },
  country: { type: String, required: true },
  key: { type: String },
  expirationDate: { type: String, required: true },
  issueDate: { type: String, required: true },
});

module.exports = mongoose.model("Passport", schema);
