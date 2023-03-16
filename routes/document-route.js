const express = require("express");
const router = express.Router();
const multer = require("multer");
const documentController = require("./../controller/document-controller");
const upload = multer({});

router.get("/:uid", documentController.getUserAllDocs);
router.post(
  "/upload",
  upload.single("file"),
  documentController.uploadUserDocs
);
router.delete("/delete", documentController.deleteUserDocs);
router.patch(
  "/update",
  upload.single("file"),
  documentController.updateUserDocs
);

module.exports = router;
