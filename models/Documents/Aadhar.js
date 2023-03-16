const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  documentS3Link: { type: String },
  key: { type: String },
  userId: { type: String, required: true },
});

module.exports = mongoose.model("Aadhar", schema);
