require("dotenv").config();
const aws3 = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
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
};

const uploadFileAWS = async (filename, buffer, ctype) => {
  let uploadParams = {
    Key: filename,
    Bucket: "wesafe-documents",
    Body: buffer,
    ContentType: ctype,
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
    entry: [
      "userId",
      "state",
      "country",
      "expirationDate",
      "issueDate",
      "contentType",
    ],
  },
  passport: {
    name: "passport",
    entry: ["userId", "country", "expirationDate", "issueDate", "contentType"],
  },
  birth: { name: "birth", entry: ["userId", "contentType"] },
  vaccine: { name: "vaccine", entry: ["userId", "contentType"] },
  pan: { name: "pan", entry: ["userId", "contentType"] },
  aadhar: { name: "aadhar", entry: ["userId", "contentType"] },
  other: { name: "other", entry: ["userId", "name", "contentType"] },
};

const getter = (objArray) => {
  objArray.forEach((curr) => curr.toObject({ getters: true }));
};
exports.getUserAllDocs = async (req, res) => {
  try {
    const userId = req.params.uid;

    const results = {
      totalDocs: 0,
      driver: {
        len: 0,
        data: [],
      },
      passport: { len: 0, data: [] },
      birth: { len: 0, data: [] },
      vaccine: { len: 0, data: [] },
      pan: { len: 0, data: [] },
      aadhar: { len: 0, data: [] },
      other: { len: 0, data: [] },
    };

    let docs1 = await DriverLicense.find({ userId });
    getter(docs1);
    results.driver.len = docs1.length;
    results.totalDocs += docs1.length;
    results.driver.data = docs1;

    let docs2 = await Passport.find({ userId });
    getter(docs2);
    results.passport.len = docs2.length;
    results.totalDocs += docs2.length;
    results.passport.data = docs2;

    let docs3 = await BirthCertificate.find({ userId });
    getter(docs3);
    results.birth.len = docs3.length;
    results.totalDocs += docs3.length;
    results.birth.data = docs3;

    let docs4 = await VaccineCard.find({ userId });
    getter(docs4);
    results.vaccine.len = docs4.length;
    results.totalDocs += docs4.length;
    results.vaccine.data = docs4;

    let docs5 = await Pan.find({ userId });
    getter(docs5);
    results.pan.len = docs5.length;
    results.totalDocs += docs5.length;
    results.pan.data = docs5;

    let docs6 = await Aadhar.find({ userId });
    getter(docs6);
    results.aadhar.len = docs6.length;
    results.totalDocs += docs6.length;
    results.aadhar.data = docs6;

    let docs7 = await Other.find({ userId });
    getter(docs7);
    results.other.len = docs7.length;
    results.totalDocs += docs7.length;
    results.other.data = docs7;

    res.json({ ok: true, results });
  } catch (err) {
    console.log(err);
    res.status(500).json({ ok: false, msg: err.message, err });
  }
};

exports.uploadUserDocs = async (req, res) => {
  let filename,
    flag = 0;
  try {
    const { docType, contentType } = req.body;

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
    const response = await uploadFileAWS(
      filename,
      req.file.buffer,
      contentType
    );

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
    const { objId, docType, key, oldLink, contentType } = req.body;

    if (fields[docType] === undefined) {
      return res.status(400).json({ ok: false, msg: "no such field" });
    }

    if (oldLink === "" && !req.file) {
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

    console.log(oldLink);
    // upload file to AWS
    if (!oldLink) {
      const endName = req?.file?.originalname?.slice(
        req.file.originalname.indexOf(".")
      );
      filename = encodeURI(
        `${req.body.userId}/${Date.now()}_${docType}${endName}`
      );

      await uploadFileAWS(filename, req?.file?.buffer, contentType);

      flag = 1;

      target.documentS3Link = `https://wesafe-documents.s3.ap-south-1.amazonaws.com/${filename}`;
      target.key = filename;
    } else {
      target.documentS3Link = oldLink;
      target.key = key;
    }

    const ret = await target.update(target);

    if (oldLink === "") {
      try {
        await deleteFileAWS(key);
      } catch (err) {}
    }

    res.status(200).json({ ok: true, msg: "Successfully updated the doc" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ ok: false, msg: err?.message, err });
  }
};

exports.getPresignedURL = async (req, res) => {
  try {
    const { key, time } = req.body;

    if (!key || !time) {
      return res.status(400).json({ ok: false, msg: "missing field" });
    }

    const command = new aws3.GetObjectCommand({
      Bucket: "wesafe-documents",
      Key: key,
    });

    const url = await getSignedUrl(s3Instance, command, { expiresIn: time });

    res.status(200).json({ ok: true, url });
  } catch (err) {
    res.status(500).json({
      ok: false,
      msg: err?.message || "Something went wrong!",
      err,
    });
  }
};
