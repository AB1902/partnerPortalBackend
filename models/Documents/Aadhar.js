const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  documentS3Link: { type: String },
  key: { type: String, required: true },
  userId: { type: String, required: true },
  contentType: { type: String },
});

module.exports = mongoose.model("Aadhar", schema);
