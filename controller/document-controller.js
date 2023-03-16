require("dotenv").config();
const aws3 = require("@aws-sdk/client-s3");

// doc models
const Aadhar = require("./../models/Documents/Aadhar");
const BirthCertificate = require("./../models/Documents/BirthCertificate");
const DriverLicense = require("./../models/Documents/DriverLicense");
const Other = require("./../models/Documents/Other");
const Pan = require("./../models/Documents/Pan");
const Passport = require("./../models/Documents/Passport");
const VaccineCard = require("./../models/Documents/VaccineCard");

const secret = process.env.access_secret;
const key = process.env.access_key;
const region = process.env.region;
const s3Instance = new aws3.S3Client({
  region,
  credentials: {
    accessKeyId: key,
    secretAccessKey: secret,
  },
});

const getAllFilesInAWS = async () => {
  const command = new aws3.ListObjectsV2Command({
    Bucket: "wesafe-documents",
    MaxKeys: 1000,
  });

  let isTruncated = true;
  let contents = {
    rawData: [],
    keys: [],
  };

  while (isTruncated) {
    const { Contents, IsTruncated, NextContinuationToken } =
      await s3Instance.send(command);

    contents.keys = [...contents.keys, ...Contents.map((crr) => crr.Key)];
    contents.rawData = [...contents.rawData, ...Contents];
    isTruncated = IsTruncated;
    command.input.ContinuationToken = NextContinuationToken;
  }

  return contents;

  res.json({ msg: err.message, err });
};

const uploadFileAWS = async (filename, buffer) => {
  let uploadParams = {
    Key: filename,
    Bucket: "wesafe-documents",
    Body: buffer,
  };

  const command = new aws3.PutObjectCommand(uploadParams);
  const response = await s3Instance.send(command);

  return response;
};

const deleteFileAWS = async (keyName) => {
  const command = new aws3.DeleteObjectCommand({
    Bucket: "wesafe-documents",
    Key: keyName,
  });

  const response = await s3Instance.send(command);
  return response;
};

const getFileFromAWS = async () => {
  const command = new aws3.GetObjectCommand({
    Bucket: "wesafe-documents",
    Key: "user1_child1_sdsdsd.pdf",
  });

  const response = await s3Instance.send(command);
  const str = await response.Body.transformToString();

  return str;
};

const fields = {
  driver: {
    name: "driver",
    entry: ["userId", "state", "country", "expirationDate", "issueDate"],
  },
  passport: {
    name: "passport",
    entry: ["userId", "country", "expirationDate", "issueDate"],
  },
  birth: { name: "birth", entry: ["userId"] },
  vaccine: { name: "vaccine", entry: ["userId"] },
  pan: { name: "pan", entry: ["userId"] },
  aadhar: { name: "aadhar", entry: ["userId"] },
  other: { name: "other", entry: ["userId", "name"] },
};

exports.getUserAllDocs = async (req, res) => {};

exports.uploadUserDocs = async (req, res) => {
  let filename,
    flag = 0;
  try {
    const { docType } = req.body;

    if (fields[docType] === undefined) {
      return res.status(400).json({ ok: false, msg: "no such field" });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, msg: "no file attached" });
    }
    const finalObj = {};

    fields[docType].entry.forEach((curr) => {
      if (req.body[curr]) {
        finalObj[curr] = req.body[curr];
      } else {
        return res.status(400).json({ ok: false, msg: "missing field" });
      }
    });

    let newDoc;
    if (docType === "driver") {
      newDoc = new DriverLicense(finalObj);
    } else if (docType === "passport") {
      newDoc = new Passport(finalObj);
    } else if (docType === "birth") {
      newDoc = new BirthCertificate(finalObj);
    } else if (docType === "vaccine") {
      newDoc = new VaccineCard(finalObj);
    } else if (docType === "pan") {
      newDoc = new Pan(finalObj);
    } else if (docType === "aadhar") {
      newDoc = new Aadhar(finalObj);
    } else if (docType === "other") {
      newDoc = new Other(finalObj);
    }

    // upload file to AWS
    const endName = req.file.originalname.slice(
      req.file.originalname.indexOf(".")
    );
    filename = encodeURI(
      `${req.body.userId}/${Date.now()}_${docType}${endName}`
    );

    console.log(filename);
    const response = await uploadFileAWS(filename, req.file.buffer);

    flag = 1;

    newDoc.documentS3Link = `https://wesafe-documents.s3.ap-south-1.amazonaws.com/${filename}`;
    newDoc.key = filename;

    const resp = await newDoc.save();

    res.status(200).json({ data: resp.toObject({ getters: true }) });
  } catch (err) {
    console.log(err);
    if (flag === 1) {
      // delete file from aws
      try {
        await deleteFileAWS(filename);
      } catch (err) {
        console.log(err);
      }
    }
    return res
      .status(500)
      .json({ ok: false, msg: err?.message || "Something went wrong", err });
  }
};

exports.deleteUserDocs = async (req, res) => {
  try {
    const { objId, docType, key } = req.body;

    let target;

    if (docType === "driver") {
      target = await DriverLicense.findOne({ id: objId });
    } else if (docType === "passport") {
      target = await Passport.findOne({ id: objId });
    } else if (docType === "birth") {
      target = await BirthCertificate.findOne({ id: objId });
    } else if (docType === "vaccine") {
      target = await VaccineCard.findOne({ id: objId });
    } else if (docType === "pan") {
      target = await Pan.findOne({ id: objId });
    } else if (docType === "aadhar") {
      target = await Aadhar.findOne({ id: objId });
    } else if (docType === "other") {
      target = await Other.findOne({ id: objId });
    }

    if (!target) {
      return res.status(500).json({ ok: false, msg: "No object with this id" });
    }
    await target.remove();

    try {
      const x = await deleteFileAWS(key);
      console.log(x);
    } catch (err) {
      console.log(err);
    }

    res.status(200).json({ ok: true, msg: "Record deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ ok: false, msg: err?.message, err });
  }
};

exports.updateUserDocs = async (req, res) => {
  try {
    const { objId, docType, key } = req.body;

    if (fields[docType] === undefined) {
      return res.status(400).json({ ok: false, msg: "no such field" });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, msg: "no file attached" });
    }

    let target;

    if (docType === "driver") {
      target = await DriverLicense.findOne({ id: objId });
    } else if (docType === "passport") {
      target = await Passport.findOne({ id: objId });
    } else if (docType === "birth") {
      target = await BirthCertificate.findOne({ id: objId });
    } else if (docType === "vaccine") {
      target = await VaccineCard.findOne({ id: objId });
    } else if (docType === "pan") {
      target = await Pan.findOne({ id: objId });
    } else if (docType === "aadhar") {
      target = await Aadhar.findOne({ id: objId });
    } else if (docType === "other") {
      target = await Other.findOne({ id: objId });
    }

    fields[docType].entry.forEach((curr) => {
      if (req.body[curr]) {
        target[curr] = req.body[curr];
      } else {
        return res.status(400).json({ ok: false, msg: "missing field" });
      }
    });

    // upload file to AWS
    const endName = req?.file?.originalname?.slice(
      req.file.originalname.indexOf(".")
    );
    filename = encodeURI(
      `${req.body.userId}/${Date.now()}_${docType}${endName}`
    );
    await uploadFileAWS(filename, req?.file?.buffer);

    flag = 1;

    target.documentS3Link = `https://wesafe-documents.s3.ap-south-1.amazonaws.com/${filename}`;
    target.key = filename;

    const ret = await target.update(target);

    try {
      await deleteFileAWS(key);
    } catch (err) {}

    res.status(200).json({ ok: true, msg: "Successfully updated the doc" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ ok: false, msg: err?.message, err });
  }
};
