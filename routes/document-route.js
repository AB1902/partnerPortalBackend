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
router.post("/delete", documentController.deleteUserDocs);
router.post(
  "/update",
  upload.single("file"),
  documentController.updateUserDocs
);
router.post("/getSignedURL", documentController.getPresignedURL);

module.exports = router;
