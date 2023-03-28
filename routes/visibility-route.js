const express = require("express");
const router = express.Router();
const visibilityController = require("./../controller/visibility-controller");

router.get("/:userId", visibilityController.getUserVisibility);
router.post("/update", visibilityController.updateAndAddUserVisibility);

module.exports = router;
