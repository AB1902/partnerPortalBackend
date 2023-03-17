const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  documentS3Link: { type: String },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  key: { type: String },
  contentType: { type: String },
});

module.exports = mongoose.model("Other", schema);
