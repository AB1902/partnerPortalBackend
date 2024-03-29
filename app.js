const express = require("express");
const app = express();
const connectDB = require("./config/db");
const Partners = require("./models/Partners");
const Customers = require("./models/Customers");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const Grid = require("gridfs-stream");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const PartnerUsers = require("./models/PartnerUsers");
const Groups = require("./models/Groups");
const mo = require("method-override");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const mongoose = require("mongoose");
const Document = require("./models/Documents");
const { cursorTo } = require("readline");
const config = require("config");
const CustomerGroups = require("./models/CustomerGroups");
const CustomerQr = require("./models/CustomerQr");
const lastScannedQr = require("./models/LastScannedQr");
const { db } = require("./models/Partners");
const csv = require("csvtojson");
const other = require("./models/Documents/Other");
const cookieParser = require("cookie-parser");
const Cookies = require("js-cookie");
// const { initializeApp } = require('firebase-admin/app');
// const fbApp=initializeApp()
var admin = require("firebase-admin");
const serviceAccount = require("./wesafeclone-8866289e61b3.json");
// const SAK=require(process.env.SAK)
// const SAK=process.env.SAK

// aws document configs
const documentRouter = require("./routes/document-route");
const visibilityRouter = require("./routes/visibility-route");
const smsController = require("./controller/sms-controller");
const { request } = require("http");

connectDB();

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(cookieParser())
app.use(express.static(path.resolve(__dirname, "public")));

// app.use(express.static(path.resolve(__dirname, "uploads")));
app.use("/api/wesafe/docs", documentRouter);
app.use("/api/wesafe/visibility", visibilityRouter);

app.post("/api/wesafe/customSms", smsController.sendSms);
app.post("/api/wesafe/commonSms", smsController.sendMessgeToSubs);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://wesafeclone-default-rtdb.firebaseio.com",
});

var fireDb = admin.firestore();

app.get("/api/fireBaseData", async (req, res) => {
  const qrCodeRef = fireDb.collection("QRCode").doc("1uFTMh");
  const doc = await qrCodeRef.get();
  if (!doc.exists) {
    res.json({ message: "no document" });
  } else {
    res.json({ document: doc });
  }
});

// console.log(qrCodes)
// var ref = fireDb.ref("QRCode");
// ref.once("value", function(snapshot) {
//     console.log(snapshot.val());
// });
// var ref=fireDb.collection('QRCode')
// console.log(ref)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, filename, cb) => {
    cb(null, Date.now() + filename.originalname);
  },
});

var customerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/customerUploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const customerUpload = multer({ storage: customerStorage });

const upload = multer({
  storage,
}).single("filename");

app.get("/api/", (req, res) => {
  res.send("route working");
});

app.get("/api/partners", async (req, res) => {
  let partners = await Partners.find({});
  res.json({ partners });
});

app.get("/api/partnerUsers", async (req, res) => {
  let partnerUsers = await PartnerUsers.find({});
  res.json({ partnerUsers });
});

app.get("/api/groups", async (req, res) => {
  let groups = await Groups.find({});
  res.json({ groups });
});

app.get("/api/customers/:id/groups", async (req, res) => {
  const customerId = req.params.id;
  const customerGroups = await CustomerGroups.find({ customerId });
  res.json({ customerGroups });
});

app.get("/api/customers/:id/qr", async (req, res) => {
  const customerId = req.params.id;
  const customerQrs = await CustomerQr.find({ customerId });
  res.json({ customerQrs });
});

app.delete("/api/doc/:id", async (req, res) => {
  const _id = req.params.id;
  Document.findByIdAndDelete(_id)
    .then((result) => {
      res.json({ result, deleted: true });
    })
    .catch((err) => {
      res.json({ error: err.message });
    });
});

app.delete("/api/qr/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const qrDetails = await CustomerQr.find({ _id: id });
    const qrCodeRef = fireDb.collection("QRCode").doc(`${qrDetails[0].qrId}`);
    const doc = await qrCodeRef.get();
    //const scanData=await lastScannedQr.find({qrcode:qrDetails[0].qrId})
    await qrCodeRef.set({
      Consumed: false,
      UserMapped: false,
      PIN: "",
      UserID: "",
      URL: "",
      default: false,
      Passcode: "",
      ID: "",
      Label: "",
      SubContractor: "",
    });
    await lastScannedQr.deleteMany({ qrcode: qrDetails[0].qrId });
    await CustomerQr.findByIdAndDelete(id);
    res.json({ result, deleted: true });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get("/api/customers", async (req, res) => {
  let customers = await Customers.find({});
  res.json({ customers });
});

app.get("/api/upload", async (req, res) => {
  const docs = await Document.find({});
  res.status(200).json({ docs });
});

app.get("/api/upload/:id", async (req, res) => {
  const customerHash = req.params.id;
  const doc = await Document.find({ customerHash });
  res.json({ doc });
});

app.get("/api/documents", async (req, res) => {
  var customers = await Customers.aggregate([
    {
      $lookup: {
        from: "customergroups",
        localField: "_id",
        foreignField: "customerId",
        as: "customerGroups",
      },
    },
    {
      $lookup: {
        from: "customerqrs",
        localField: "_id",
        foreignField: "customerId",
        as: "customerQrs",
      },
    },
    {
      $lookup: {
        from: "others",
        let: {
          userUid_childListUid: { $concat: ["$userUid", "_", "$childListUid"] },
        },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$userUid_childListUid"] } } },
        ],
        as: "customerDocs",
      },
    },
    {
      $lookup: {
        from: "lastscanneds",
        localField: "_id",
        foreignField: "customerId",
        as: "lastScanned",
      },
    },
  ]);
  // customers=customers.filter(customer => {
  //   if(customer.customerDocs.length>0)
  //     return customer
  // })
  res.json({ customers });
});

app.get("/api/customerData", async (req, res) => {
  var customers = await Customers.aggregate([
    {
      $lookup: {
        from: "customergroups",
        localField: "_id",
        foreignField: "customerId",
        as: "customerGroups",
      },
    },
    {
      $lookup: {
        from: "customerqrs",
        localField: "_id",
        foreignField: "customerId",
        as: "customerQrs",
      },
    },
    {
      $lookup: {
        from: "others",
        let: {
          userUid_childListUid: { $concat: ["$userUid", "_", "$childListUid"] },
        },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$userUid_childListUid"] } } },
        ],
        as: "customerDocs",
      },
    },
    // {
    //   $lookup: {
    //     from: "documents",
    //     localField: "_id",
    //     foreignField: "customerId",
    //     as: "customerDocs",
    //   },
    // },
    {
      $lookup: {
        from: "lastscanneds",
        localField: "_id",
        foreignField: "customerId",
        as: "lastScanned",
      },
    },
  ]);

  res.json({ customers });
});

app.get("/api/customerData/:id/search", async (req, res) => {
  var searchKey = req.query.searchKey.toLowerCase().trim();
  console.log(searchKey);
  const { id } = req.params;
  var customers = await Customers.aggregate([
    {
      $lookup: {
        from: "customergroups",
        localField: "_id",
        foreignField: "customerId",
        as: "customerGroups",
      },
    },
    {
      $lookup: {
        from: "customerqrs",
        localField: "_id",
        foreignField: "customerId",
        as: "customerQrs",
      },
    },
    {
      $lookup: {
        from: "others",
        let: {
          userUid_childListUid: { $concat: ["$userUid", "_", "$childListUid"] },
        },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$userUid_childListUid"] } } },
        ],
        as: "customerDocs",
      },
    },
    // {
    //   $lookup: {
    //     from: "documents",
    //     localField: "_id",
    //     foreignField: "customerId",
    //     as: "customerDocs",
    //   },
    // },
    {
      $lookup: {
        from: "lastscanneds",
        localField: "_id",
        foreignField: "customerId",
        as: "lastScanned",
      },
    },
  ]);

  customers = customers.filter((customer) => {
    if (customer.partnerUid === id) return customer;
  });

  let filteredData = customers?.filter((data) => {
    const customerData = Object.keys(data).some((key) => {
      return data[key]?.toString().toLowerCase().includes(searchKey);
    });
    return customerData;
  });

  res.json({ customers: filteredData });
});

app.get("/api/customerData/:id/new", async (req, res) => {
  const page = parseInt(req.query.page);
  const limit = parseInt(req.query.limit);
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const { id } = req.params;
  var customers = await Customers.aggregate([
    {
      $lookup: {
        from: "customergroups",
        localField: "_id",
        foreignField: "customerId",
        as: "customerGroups",
      },
    },
    {
      $lookup: {
        from: "customerqrs",
        localField: "_id",
        foreignField: "customerId",
        as: "customerQrs",
      },
    },
    {
      $lookup: {
        from: "others",
        let: {
          userUid_childListUid: { $concat: ["$userUid", "_", "$childListUid"] },
        },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$userUid_childListUid"] } } },
        ],
        as: "customerDocs",
      },
    },
    // {
    //   $lookup: {
    //     from: "documents",
    //     localField: "_id",
    //     foreignField: "customerId",
    //     as: "customerDocs",
    //   },
    // },
    {
      $lookup: {
        from: "lastscanneds",
        localField: "_id",
        foreignField: "customerId",
        as: "lastScanned",
      },
    },
  ]);

  customers = customers.filter((customer) => {
    if (customer.partnerUid === id) return customer;
  });

  const results = {};
  if (startIndex > 0) {
    results.next = {
      page: page + 1,
      limit: limit,
    };
  }
  if (endIndex < customers.length) {
    results.previous = {
      page: page - 1,
      limit: limit,
    };
  }
  results.total = customers.length;
  results.customers = customers.slice(startIndex, endIndex);
  res.json({ results });
});

//filter route
app.post("/api/customerData/:id/filter", async (req, res) => {
  const {
    groupSelect,
    groupAssigned,
    qrAssigned,
    docsAssigned,
    qrScanData,
    registerDateStart,
    registerDateEnd,
  } = req.body;
  date1 = new Date(registerDateStart);
  date2 = new Date(registerDateEnd);
  console.log(
    groupSelect,
    groupAssigned,
    qrAssigned,
    docsAssigned,
    qrScanData,
    date1,
    date2
  );
  const { id } = req.params;

  var customers = await Customers.aggregate([
    {
      $lookup: {
        from: "customergroups",
        localField: "_id",
        foreignField: "customerId",
        as: "customerGroups",
      },
    },
    {
      $lookup: {
        from: "customerqrs",
        localField: "_id",
        foreignField: "customerId",
        as: "customerQrs",
      },
    },
    // {
    //   $lookup: {
    //     from: "documents",
    //     localField: "_id",
    //     foreignField: "customerId",
    //     as: "customerDocs",
    //   },
    // },
    {
      $lookup: {
        from: "others",
        let: {
          userUid_childListUid: { $concat: ["$userUid", "_", "$childListUid"] },
        },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$userUid_childListUid"] } } },
        ],
        as: "customerDocs",
      },
    },
    {
      $lookup: {
        from: "lastscanneds",
        localField: "_id",
        foreignField: "customerId",
        as: "lastScanned",
      },
    },
  ]);

  customers = customers.filter((customer) => {
    if (customer.partnerUid === id) return customer;
  });

  let filteredData = [];

  // if(registerDateStart!=='from' && registerDateEnd!=='to'){
  //   customers=await Customers.find({
  //       created_on: {
  //         $gte: new Date(registerDateStart),
  //         $lt: new Date(registerDateEnd)
  //       }
  //   })
  //   console.log(customers)
  // }

  if (groupSelect !== "All") {
    customers.forEach((customer) => {
      customer.customerGroups.forEach((group) => {
        if (group.groupName === groupSelect) filteredData.push(customer);
      });
      if (groupAssigned === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.customerGroups.length > 0) return data;
        });
      } else if (groupAssigned == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.customerGroups.length === 0) return data;
        });
      }
      if (qrAssigned === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.customerQrs.length > 0) return data;
        });
      } else if (qrAssigned == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.customerQrs.length === 0) return data;
        });
      }
      if (docsAssigned === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.customerDocs.length > 0) return data;
        });
      } else if (docsAssigned == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.customerDocs.length === 0) return data;
        });
      }
      if (qrScanData === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length > 0) return data;
        });
      } else if (qrScanData == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length === 0) return data;
        });
      }
    });
    if (
      registerDateStart !== "from" &&
      registerDateEnd !== "to" &&
      filteredData.length > 0
    ) {
      filteredData = filteredData.filter((data) => {
        if (data.dateRegistered) {
          if (
            date1.getTime() <= new Date(data.dateRegistered).getTime() &&
            date2.getTime() >= new Date(data.dateRegistered).getTime()
          )
            return data;
        }
      });
    } else if (
      registerDateStart !== "from" &&
      registerDateEnd !== "to" &&
      filteredData.length === 0
    ) {
      filteredData = customers.filter((data) => {
        if (data.dateRegistered) {
          if (
            date1.getTime() <= new Date(data.dateRegistered).getTime() &&
            date2.getTime() >= new Date(data.dateRegistered).getTime()
          )
            return data;
        }
      });
    }
  } else {
    if (groupAssigned === "Yes") {
      // filteredData = filteredData.filter((data) => {
      //   if (data.customerGroups.length > 0) return data;
      // })
      customers.forEach((customer) => {
        if (customer.customerGroups.length > 0) filteredData.push(customer);
      });
      if (qrAssigned === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.customerQrs.length > 0) return data;
        });
      } else if (qrAssigned == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.customerQrs.length === 0) return data;
        });
      }
      if (docsAssigned === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.customerDocs.length > 0) return data;
        });
      } else if (docsAssigned == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.customerDocs.length === 0) return data;
        });
      }
      if (qrScanData === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length > 0) return data;
        });
      } else if (qrScanData == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length === 0) return data;
        });
      }
    } else if (groupAssigned === "No") {
      customers.forEach((customer) => {
        if (customer.customerGroups.length === 0) filteredData.push(customer);
      });
      if (qrAssigned === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.customerQrs.length > 0) return data;
        });
      } else if (qrAssigned == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.customerQrs.length === 0) return data;
        });
      }
      if (docsAssigned === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.customerDocs.length > 0) return data;
        });
      } else if (docsAssigned == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.customerDocs.length === 0) return data;
        });
      }
      if (qrScanData === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length > 0) return data;
        });
      } else if (qrScanData == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length === 0) return data;
        });
      }
    } else if (qrAssigned === "Yes") {
      customers.forEach((customer) => {
        if (customer.customerQrs.length > 0) filteredData.push(customer);
      });
      if (docsAssigned === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.customerDocs.length > 0) return data;
        });
      } else if (docsAssigned == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.customerDocs.length === 0) return data;
        });
      }
      if (qrScanData === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length > 0) return data;
        });
      } else if (qrScanData == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length === 0) return data;
        });
      }
    } else if (qrAssigned === "No") {
      customers.forEach((customer) => {
        if (customer.customerQrs.length === 0) filteredData.push(customer);
      });
      if (docsAssigned === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.customerDocs.length > 0) return data;
        });
      } else if (docsAssigned == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.customerDocs.length === 0) return data;
        });
      }
      if (qrScanData === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length > 0) return data;
        });
      } else if (qrScanData == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length === 0) return data;
        });
      }
    } else if (docsAssigned === "Yes") {
      customers.forEach((customer) => {
        if (customer.customerDocs.length > 0) filteredData.push(customer);
      });
      if (qrScanData === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length > 0) return data;
        });
      } else if (qrScanData == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length === 0) return data;
        });
      }
    } else if (docsAssigned === "No") {
      customers.forEach((customer) => {
        if (customer.customerDocs.length === 0) filteredData.push(customer);
      });
      if (qrScanData === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length > 0) return data;
        });
      } else if (qrScanData == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length === 0) return data;
        });
      }
    } else if (qrScanData === "Yes") {
      customers.forEach((customer) => {
        if (customer.lastScanned.length > 0) filteredData.push(customer);
      });
    } else if (qrScanData === "No") {
      customers.forEach((customer) => {
        if (customer.lastScanned.length === 0) filteredData.push(customer);
      });
    }
  }
  if (
    registerDateStart !== "from" &&
    registerDateEnd !== "to" &&
    filteredData.length > 0
  ) {
    filteredData = filteredData.filter((data) => {
      if (data.dateRegistered) {
        if (
          date1.getTime() <= new Date(data.dateRegistered).getTime() &&
          date2.getTime() >= new Date(data.dateRegistered).getTime()
        )
          return data;
      }
    });
  } else if (
    registerDateStart !== "from" &&
    registerDateEnd !== "to" &&
    filteredData.length === 0
  ) {
    filteredData = customers.filter((data) => {
      if (data.dateRegistered) {
        if (
          date1.getTime() <= new Date(data.dateRegistered).getTime() &&
          date2.getTime() >= new Date(data.dateRegistered).getTime()
        )
          return data;
      }
    });
  }
  console.log(filteredData);

  res.json({ filteredData });
});

app.post("/api/partnerUsers/signup", async (req, res) => {
  try {
    const { partnerUserEmail, mobile, partnerUid, partnerUserUid, password } =
      req.body;
    let partnerUser = await PartnerUsers.findOne({ partnerUserEmail });
    if (partnerUser) {
      res.status(420).json({ message: "user already exists" });
      return;
    }
    partnerUser = new PartnerUsers({
      partnerUserEmail,
      mobile,
      partnerUserUid,
      partnerUid,
      password,
    });
    const salt = await bcrypt.genSalt(10);
    partnerUser.password = await bcrypt.hash(password, salt);
    await partnerUser.save();
    res.status(200).json({ message: "partnerUser successsfully registered" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/partnerUsers/login", async (req, res) => {
  const { partnerUserEmail } = req.body;
  const { password } = req.body;
  try {
    let partner = await PartnerUsers.find({ partnerUserEmail });
    if (!partner) {
      res.json({ message: "user not found" });
    }
    //res.json(partner[0].password)
    console.log(partner);
    const validPassword = await bcrypt.compare(password, partner[0].password);
    if (!validPassword) {
      res.status(400).json({ message: "wrong password" });
    }

    const payload = {
      loggedInPartnerUser: {
        id: partner[0].partnerUserUid,
      },
    };

    // res.cookie("payload",payload,{
    //   httpOnly:true,
    //   secure: false
    // })

    jwt.sign(payload, config.get("JWTSecret"), (err, token) => {
      if (err) console.log(err.message);
      // res.cookie("jwToken",token,{
      //     expires:new Date(Date.now()+18000000),
      //     httpOnly:true
      // })
      // res.cookie('payload',payload.loggedInPartnerUser.id,{
      //   httpOnly:true
      // })

      res
        .status(200)
        .json({ token, message: "logged in successfully", partner, payload });
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/partners", async (req, res) => {
  try {
    const { businessName, partnerUid, maxUsers, maxPartnerUsers, maxGroups } =
      req.body;
    let partner = await Partners.findOne({ partnerUid });
    if (partner) {
      res.status(240).send("Partner already exists in db");
      return;
    }
    partner = new Partners({
      businessName,
      partnerUid,
      maxUsers,
      maxPartnerUsers,
      maxGroups,
    });
    await partner.save();
    res.json({ message: "Partner saved successfully" });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.post("/api/groups", async (req, res) => {
  try {
    const { groupName, partnerUid, groupDescription, startDate, endDate } =
      req.body;
    let group = await Groups.findOne({ groupName });
    if (group) {
      res.status(240).send("group already exists in db");
      return;
    }
    group = new Groups({
      groupName,
      partnerUid,
      groupDescription,
      startDate,
      endDate,
    });
    group.startDate = new Date(startDate);
    group.endDate = new Date(endDate);

    await group.save();
    res.json({ message: "group saved successfully" });
  } catch (error) {
    res.json({ error: error.message });
  }
});

//add many customers to already exitsing group
app.post("/api/groupsAddMany", async (req, res) => {
  const {
    groupName,
    groupId,
    groupDescription,
    partnerUid,
    startDate,
    endDate,
  } = req.body;
  const dataArr = req.body.dataArr;
  try {
    dataArr.forEach(async (data) => {
      if (data.isChecked === true) {
        const customergroup = new CustomerGroups({
          customerId: data._id,
          groupName,
          groupId,
          groupDescription,
          partnerUid,
          startDate,
          endDate,
        });
        await customergroup.save();
      }
    });
    res.json({ message: "customers added" });
  } catch (error) {
    res.json({ error: error.message });
  }
});

//add multiple customers to a newly created group
app.post("/api/createGroupAddMultiCustomer", async (req, res) => {
  try {
    const { groupName, groupDescription, startDate, endDate } = req.body;
    const dataArr = req.body.dataArr;
    const partnerUid = "7ocUlGvJ22l4O1gbfg0p";
    let group = new Groups({
      groupName,
      groupDescription,
      partnerUid,
      startDate,
      endDate,
    });
    group.startDate = new Date(startDate);
    group.endDate = new Date(endDate);

    await group.save();
    // console.log(group._id)
    // res.json({group})
    const groupId = group._id;

    dataArr.forEach(async (data) => {
      if (data.isChecked === true) {
        try {
          const customerGroup = new CustomerGroups({
            customerId: data._id,
            groupId,
            groupName,
            groupDescription,
            partnerUid,
            startDate,
            endDate,
          });
          await customerGroup.save();
        } catch (error) {
          console.log(error.message);
        }
      }
    });

    res.json({ message: "group created and customers added", group });
  } catch (error) {
    res.json({ error: error.message });
  }
});

//add a single customer to a new group
app.post("/api/createGroupAddCustomer/:id", async (req, res) => {
  const customerId = req.params.id;
  try {
    const { groupName, groupDescription, startDate, endDate } = req.body;
    const partnerUid = "7ocUlGvJ22l4O1gbfg0p";
    let group = new Groups({
      groupName,
      groupDescription,
      partnerUid,
      startDate,
      endDate,
    });
    group.startDate = new Date(startDate);
    group.endDate = new Date(endDate);

    await group.save();
    // console.log(group._id)
    // res.json({group})
    const groupId = group._id;
    try {
      const customerGroup = new CustomerGroups({
        customerId,
        groupId,
        groupName,
        groupDescription,
        partnerUid,
        startDate,
        endDate,
      });
      await customerGroup.save();
    } catch (error) {
      console.log(error.message);
    }
    res.json({ message: "group created and customer added", group });
  } catch (error) {
    res.json({ error: error.message });
  }
});

//upload a doucment to a single customer

app.get("/api/getfile/:filename", function (req, response) {
  const filename = req.params.filename;
  var tempFile = `./uploads/${filename}`;
  response.contentType("blob").sendFile(`${filename}`, { root: "./uploads" });
});

app.post("/api/upload", async (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      console.log(err.message);
    }
    if (!req.body.customerId) {
      res.json({ message: "user does not exist" });
    } else {
      const newDoc = new Document({
        customerHash: req.body.customerHash,
        description: req.body.description,
        name: req.body.name,
        document: {
          data: req.file.filename,
          contentType: "application/pdf",
        },
        customerId: req.body.customerId,
      });
      newDoc
        .save()
        .then(() => res.json({ message: "success", newDoc }))
        .catch((err) => console.log(err.message));
    }
  });
});

//upload a doucment to multiple customers
app.post("/api/uploadToMultiCustomers", async (req, res) => {
  try {
    upload(req, res, (err) => {
      if (err) {
        console.log(err.message);
      } else {
        const dataArr = JSON.parse(req.body.dataArr);
        console.log(dataArr);
        dataArr.forEach(async (data) => {
          if (data.isChecked === true) {
            const newDoc = new Document({
              description: req.body.description,
              name: req.body.name,
              document: {
                data: req.file.filename,
                contentType: "application/pdf",
              },
              customerId: data._id,
            });
            newDoc.save();
          }
        });
        res.json({ message: "uploaded successfully", dataArr });
      }
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

//upload a single customer
app.post("/api/customers", async (req, res) => {
  let {
    name,
    address,
    dob,
    partnerUid,
    userUid,
    gender,
    childListUid,
    bloodGroup,
    origin,
  } = req.body;

  if (origin !== "wesafe-web") {
    if (!userUid) userUid = "undef";
    if (!childListUid) childListUid = "undef";
    if (!partnerUid) partnerUid = "undef";
    const token = req.headers["x-auth-token"];
    const payload = jwt.verify(token, "Viennacity.123");

    const loggedInUser = await PartnerUsers.find({
      partnerUserUid: payload.loggedInPartnerUser.id,
    });
    // res.json({loggedInUser})
    if (!loggedInUser) {
      console.log("not authorized");
    }
  }
  try {
    let customers = await Customers.find();
    let customer = await Customers.find({ userUid, childListUid });

    if (customer.length === 0) {
      let date = new Date(Date.now()).toString();
      let dateRegistered = date.substring(4, 15);
      let portalId =
        date.substring(11, 15) +
        date.substring(8, 10) +
        (customers.length + 1).toString();
      console.log(dateRegistered);
      console.log(date);
      console.log(portalId);
      customer = new Customers({
        name,
        address,
        dob,
        partnerUid,
        childListUid,
        userUid,
        gender,
        bloodGroup,
        dateRegistered,
        portalId,
      });
      await customer.save();
      res.status(200).json({ message: "customer added", customer });
    } else {
      const rest = await Customers.findOneAndUpdate(
        { userUid, childListUid },
        {
          name,
          address,
          dob,
          gender,
          bloodGroup,
        }
      );
      res.status(200).json({ message: "customer updated", result: rest });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//get the customer data
app.get("/api/customer/:uid/:cid", async (req, res) => {
  try {
    const { uid, cid } = req.params;

    let customer = await Customers.find({ userUid: uid, childListUid: cid });

    if (customer.length === 0) {
      return res.status(200).json({ ok: true, result: false, data: null });
    } else {
      return res
        .status(200)
        .json({ ok: true, result: true, data: customer[0] });
    }
  } catch (err) {
    console.log(err);
    return res.status(200).json({ ok: false, msg: err?.message, err });
  }
});

//upload multiple customers through excel
app.post(
  "/api/uploadMultipleCustomers",
  customerUpload.single("filename"),
  async (req, res) => {
    try {
      let customers = [];
      csv()
        .fromFile(req.file.path)
        .then(async (res) => {
          for (let i = 0; i < res.length; i++) {
            console.log(new Date(res[i].dob));
            customers.push({
              name: res[i].name,
              address: res[i].address,
              dob: new Date(res[i].dob),
              partnerUid: res[i].partnerUid,
              userUid: res[i].userUid,
              childListUid: res[i].childListUid,
              gender: res[i].gender,
              bloodGroup: res[i].bloodGroup,
            });
          }
          await Customers.insertMany(customers);
        });

      res.json({ message: "customers imported to db" });
    } catch (error) {
      res.json({ error: error.message });
    }
  }
);

// app.put("/customers/:id/qrHash",async(req,res) => {
//     const {id,pin}=req.body
//     const userUid=req.params.id
//     try {
//         let customer=await Customers.findOne({userUid})
//         if(!customer){
//             res.status(400).json({message:'user does not exist'})
//         }
//         const qr={
//             id,
//             pin
//         }

//         await Customers.findOneAndUpdate({userUid},{$push:{qrStatus:qr}})
//         res.status(200).json({message:'qr updated successfully',customer})
//     } catch (error) {
//         res.json({error:error.message})
//     }
// })

app.put("/api/customers/:id/childList", async (req, res) => {
  const { childHash } = req.body;
  const userUid = req.params.id;
  const newChild = { childHash };
  try {
    let customer = await Customers.findOne({ userUid });
    if (!customer) {
      res.status(400).json({ message: "user does not exist" });
    }
    await Customers.findOneAndUpdate(
      { userUid },
      { $push: { childList: newChild } }
    );
    res
      .status(200)
      .json({ message: "childList updated successfully", customer });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// app.put("/customers/:id/groups",async(req,res) => {
//     const {groupName,groupId,destination,startDate,endDate}=req.body
//     const userUid=req.params.id
//     try {
//         let customer=await Customers.findOne({userUid})
//         if(!customer){
//             res.status(400).json({message:'user does not exist'})
//         }
//         const group={
//             groupName,
//             groupId,
//             destination,
//             startDate,
//             endDate
//         }
//         await Customers.findOneAndUpdate({userUid},{$push:{groups:group}})
//         res.status(200).json({message:'group updated successfully',customer})
//     } catch (error) {
//         res.json({error:error.message})
//     }
// })

//adding customer to a new group
app.post("/api/customers/:id/groups", async (req, res) => {
  const {
    groupName,
    groupId,
    groupDescription,
    partnerUid,
    startDate,
    endDate,
  } = req.body;
  const customerId = req.params.id;
  try {
    const customerGroup = new CustomerGroups({
      customerId,
      groupId,
      groupName,
      groupDescription,
      partnerUid,
      startDate,
      endDate,
    });
    await customerGroup.save();
    res.json({ message: "customer added to a new group", customerGroup });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//assigning QR to customer
app.post("/api/customers/:id/qr", async (req, res) => {
  const customerId = req.params.id;
  const { qrId, qrPin, lastScanned } = req.body;
  const customer = await Customers.find({ _id: customerId });
  const customerGroups = await CustomerGroups.find({ customerId });
  try {
    const qrCodeRef = fireDb.collection("QRCode").doc(`${qrId}`);
    const doc = await qrCodeRef.get();
    if (!doc.exists) {
      res.json({ message: "qr ID not found " });
    } else {
      console.log(doc);
      if (
        doc._fieldsProto.Consumed.booleanValue === false &&
        doc._fieldsProto.UserMapped.booleanValue === false &&
        doc._fieldsProto.PIN.stringValue === "" &&
        doc._fieldsProto.UserID.stringValue === "" &&
        doc._fieldsProto.URL.stringValue === ""
      ) {
        await qrCodeRef.set({
          Consumed: true,
          UserMapped: true,
          PIN: `${qrPin}`,
          UserID: `${customer[0].userUid} ${customer[0].childListUid}`,
          URL: `http://www.wesafeqr.com/${qrId}`,
          default: true,
          Passcode: `${qrId}`,
          ID: "",
          Label: "",
          SubContractor: "qaugnitia",
        });
        const customerQr = new CustomerQr({
          customerId,
          qrId,
          qrPin,
          lastScanned,
        });
        await customerQr.save();
        res.json({
          message: "qr code assigned",
          customerQr,
          doc,
          customer,
          newDoc: qrCodeRef,
        });

        // res.json({message:'assignable',doc,customer,customerGroups,customerQr,newDoc:qrCodeRef})
      } else res.json({ message: "not assignable", doc, customer });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/:id/lastScanned", async (req, res) => {
  const {
    userUid,
    childListUid,
    ip_address,
    latitude,
    longitude,
    qrcode,
    address,
    recipients,
    smstext,
    permission_given,
    timestamp,
  } = req.body;
  const customerId = req.params.id;
  const datetime = new Date(Date.now());
  console.log({
    userUid,
    childListUid,
    ip_address,
    latitude,
    longitude,
    qrcode,
    address,
    recipients,
    smstext,
    permission_given,
    timestamp,
  });
  try {
    const userId = userUid + " " + childListUid;
    const newLastScanned = new lastScannedQr({
      customerId,
      userId,
      ip_address,
      latitude,
      longitude,
      qrcode,
      datetime,
      address,
      recipients,
      smstext,
      permission_given,
      timestamp,
    });
    await newLastScanned.save();
    res.json({ newLastScanned });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/:id/lastScanned", async (req, res) => {
  const customerId = req.params.id;
  try {
    let lastScanned = await lastScannedQr.find({ customerId });
    res.json({ lastScanned });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// app.delete("/doc/:id",async(req,res) => {
//     const _id=JSON.stringify(req.params.id)
//     const doc=Document.findById(_id)
//     if(!doc)
//         res.send("doc not found")
//     res.send(doc)
// })

app.delete("/api/customer/:id", async (req, res) => {
  const customerId = req.params.id;
  try {
    await CustomerGroups.deleteMany({ customerId });
    await CustomerQr.deleteMany({ customerId });
    await Document.deleteMany({ customerId });
    await lastScannedQr.deleteMany({ customerId });
    await Customers.findByIdAndDelete(customerId)
      .then((result) => {
        res.json({ result, deleted: true });
      })
      .catch((err) => {
        console.log(err.message);
      });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get("/api/admin", async (req, res) => {
  const page = parseInt(req.query.page);
  const limit = parseInt(req.query.limit);
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  var customers = await Customers.aggregate([
    {
      $lookup: {
        from: "customergroups",
        localField: "_id",
        foreignField: "customerId",
        as: "customerGroups",
      },
    },
    {
      $lookup: {
        from: "customerqrs",
        localField: "_id",
        foreignField: "customerId",
        as: "customerQrs",
      },
    },
    {
      $lookup: {
        from: "documents",
        localField: "_id",
        foreignField: "customerId",
        as: "customerDocs",
      },
    },
    // {
    //   $lookup: {
    //     from: "others",
    //     let:{"userUid_childListUid":{"$concat":["$userUid","_","$childListUid"]}},
    //     pipeline:[
    //       {"$match":{"$expr":{"$eq":["$userId","$$userUid_childListUid"]}}}
    //     ],
    //     as: "customerDocs",
    //   },
    // },
    {
      $lookup: {
        from: "lastscanneds",
        localField: "_id",
        foreignField: "customerId",
        as: "lastScanned",
      },
    },
  ]).sort({ created_at: 1 });

  const results = {};
  if (startIndex > 0) {
    results.next = {
      page: page + 1,
      limit: limit,
    };
  }
  if (endIndex < customers.length) {
    results.previous = {
      page: page - 1,
      limit: limit,
    };
  }
  results.total = customers.length;
  results.customers = customers.slice(startIndex, endIndex);
  res.json({ results });
});

app.post("/api/admin/filter", async (req, res) => {
  const {
    partnerSelect,
    qrAssigned,
    qrScanData,
    registerDateStart,
    registerDateEnd,
    partnerId,
  } = req.body;
  date1 = new Date(registerDateStart);
  date2 = new Date(registerDateEnd);
  console.log(partnerSelect, qrAssigned, qrScanData, date1, date2, partnerId);
  var partners = await Partners.find();
  var customers = await Customers.aggregate([
    {
      $lookup: {
        from: "customergroups",
        localField: "_id",
        foreignField: "customerId",
        as: "customerGroups",
      },
    },
    {
      $lookup: {
        from: "customerqrs",
        localField: "_id",
        foreignField: "customerId",
        as: "customerQrs",
      },
    },
    {
      $lookup: {
        from: "documents",
        localField: "_id",
        foreignField: "customerId",
        as: "customerDocs",
      },
    },
    // {
    //   $lookup: {
    //     from: "others",
    //     let:{"userUid_childListUid":{"$concat":["$userUid","_","$childListUid"]}},
    //     pipeline:[
    //       {"$match":{"$expr":{"$eq":["$userId","$$userUid_childListUid"]}}}
    //     ],
    //     as: "customerDocs",
    //   },
    // },
    {
      $lookup: {
        from: "lastscanneds",
        localField: "_id",
        foreignField: "customerId",
        as: "lastScanned",
      },
    },
  ]);

  let filteredData = [];

  if (registerDateStart !== "from" && registerDateEnd !== "to") {
    customers = customers.filter((data) => {
      if (data.dateRegistered) {
        if (
          date1.getTime() < new Date(data.dateRegistered).getTime() &&
          date2.getTime() > new Date(data.dateRegistered).getTime()
        )
          return data;
      }
    });
  }

  if (partnerSelect !== "All") {
    if (registerDateStart !== "from" && registerDateEnd !== "to") {
      customers = customers.filter((data) => {
        if (data.dateRegistered) {
          if (
            date1.getTime() <= new Date(data.dateRegistered).getTime() &&
            date2.getTime() >= new Date(data.dateRegistered).getTime()
          )
            return data;
        }
      });
    }
    customers.forEach((customer) => {
      if (customer.partnerUid === partnerId) filteredData.push(customer);
      if (qrAssigned === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.customerQrs.length > 0) return data;
        });
      } else if (qrAssigned == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.customerQrs.length === 0) return data;
        });
      }
      if (qrScanData === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length > 0) return data;
        });
      } else if (qrScanData == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length === 0) return data;
        });
      }
    });
  } else {
    if (registerDateStart !== "from" && registerDateEnd !== "to") {
      filteredData = customers.filter((data) => {
        if (data.dateRegistered) {
          if (
            date1.getTime() < new Date(data.dateRegistered).getTime() &&
            date2.getTime() > new Date(data.dateRegistered).getTime()
          )
            return data;
        }
      });
    }
    if (qrAssigned === "Yes") {
      customers.forEach((customer) => {
        if (customer.customerQrs.length > 0) filteredData.push(customer);
      });
      if (qrScanData === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length > 0) return data;
        });
      } else if (qrScanData == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length === 0) return data;
        });
      }
    } else if (qrAssigned === "No") {
      customers.forEach((customer) => {
        if (customer.customerQrs.length === 0) filteredData.push(customer);
      });
      if (qrScanData === "Yes") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length > 0) return data;
        });
      } else if (qrScanData == "No") {
        filteredData = filteredData.filter((data) => {
          if (data.lastScanned?.length === 0) return data;
        });
      }
    } else if (qrScanData === "Yes") {
      customers.forEach((customer) => {
        if (customer.lastScanned?.length > 0) filteredData.push(customer);
      });
    } else if (qrAssigned === "No") {
      customers.forEach((customer) => {
        if (customer.customerQrs.length === 0) filteredData.push(customer);
      });
    }
  }
  console.log(filteredData);

  res.json({ filteredData, partners });
});

app.get("/api/admin/search", async (req, res) => {
  var adminSearchKey = req.query.adminSearchKey.toLowerCase().trim();
  console.log(adminSearchKey);
  var customers = await Customers.aggregate([
    {
      $lookup: {
        from: "customergroups",
        localField: "_id",
        foreignField: "customerId",
        as: "customerGroups",
      },
    },
    {
      $lookup: {
        from: "customerqrs",
        localField: "_id",
        foreignField: "customerId",
        as: "customerQrs",
      },
    },
    // {
    //   $lookup: {
    //     from: "documents",
    //     localField: "_id",
    //     foreignField: "customerId",
    //     as: "customerDocs",
    //   },
    // },
    // {
    //   $lookup: {
    //     from: "others",
    //     let:{"userUid_childListUid":{"$concat":["$userUid","_","$childListUid"]}},
    //     pipeline:[
    //       {"$match":{"$expr":{"$eq":["$userId","$$userUid_childListUid"]}}}
    //     ],
    //     as: "customerDocs",
    //   },
    // },
    {
      $lookup: {
        from: "lastscanneds",
        localField: "_id",
        foreignField: "customerId",
        as: "lastScanned",
      },
    },
  ]);

  console.log(customers);

  let filteredData = customers?.filter((data) => {
    const customerData = Object.keys(data).some((key) => {
      return data[key]?.toString().toLowerCase().includes(adminSearchKey);
    });
    return customerData;
  });

  res.json({ customers: filteredData });
});

app.get("/api/admin/all", async (req, res) => {
  var customers = await Customers.aggregate([
    {
      $lookup: {
        from: "customergroups",
        localField: "_id",
        foreignField: "customerId",
        as: "customerGroups",
      },
    },
    {
      $lookup: {
        from: "customerqrs",
        localField: "_id",
        foreignField: "customerId",
        as: "customerQrs",
      },
    },
    {
      $lookup: {
        from: "documents",
        localField: "_id",
        foreignField: "customerId",
        as: "customerDocs",
      },
    },
    // {
    //   $lookup: {
    //     from: "others",
    //     let:{"userUid_childListUid":{"$concat":["$userUid","_","$childListUid"]}},
    //     pipeline:[
    //       {"$match":{"$expr":{"$eq":["$userId","$$userUid_childListUid"]}}}
    //     ],
    //     as: "customerDocs",
    //   },
    // },
    {
      $lookup: {
        from: "lastscanneds",
        localField: "_id",
        foreignField: "customerId",
        as: "lastScanned",
      },
    },
  ]);

  res.json({ customers });
});

app.get("/api/admin/scan", async (req, res) => {
  var scanData = await lastScannedQr.aggregate([
    {
      $lookup: {
        from: "customerqrs",
        localField: "customerId",
        foreignField: "customerId",
        as: "customerQrs",
      },
    },
    {
      $lookup: {
        from: "customers",
        localField: "customerId",
        foreignField: "_id",
        as: "customer",
      },
    },
  ]);
  scanData.sort((x, y) => {
    return y.datetime - x.datetime;
  });
  res.json({ scanData, message: "working" });
});

app.post("/api/admin/scan/filter", async (req, res) => {
  const { registerDateStart, registerDateEnd } = req.body;
  var filteredData = [];
  date1 = new Date(registerDateStart);
  date2 = new Date(registerDateEnd);
  var scanData = await lastScannedQr.aggregate([
    {
      $lookup: {
        from: "customerqrs",
        localField: "customerId",
        foreignField: "customerId",
        as: "customerQrs",
      },
    },
    {
      $lookup: {
        from: "customers",
        localField: "customerId",
        foreignField: "_id",
        as: "customer",
      },
    },
  ]);
  scanData.sort((x, y) => {
    return y.datetime - x.datetime;
  });
  if (registerDateStart !== "from" && registerDateEnd !== "to") {
    scanData = scanData.filter((data) => {
      if (data.datetime) {
        if (
          date1.getTime() <= new Date(data.datetime).getTime() &&
          date2.getTime() >= new Date(data.datetime).getTime()
        )
          return data;
      }
    });
  }
  console.log(scanData);
  //console.log(new Date(scanData[0].datetime),new Date(registerDateStart),new Date(registerDateEnd))
  res.json({ scanData, message: "working" });
});

app.get("/api/admin/scan/search", async (req, res) => {
  var searchKey = req.query.searchKey?.toLowerCase().trim();
  console.log(searchKey);
  var scanData = await lastScannedQr.aggregate([
    {
      $lookup: {
        from: "customerqrs",
        localField: "customerId",
        foreignField: "customerId",
        as: "customerQrs",
      },
    },
    {
      $lookup: {
        from: "customers",
        localField: "customerId",
        foreignField: "_id",
        as: "customer",
      },
    },
  ]);

  let filteredData = scanData?.filter((data) => {
    const scanData = Object.keys(data).some((key) => {
      return data[key]?.toString().toLowerCase().includes(searchKey);
    });
    return scanData;
  });

  if (filteredData.length === 0) {
    filteredData = scanData?.filter((data) => {
      const scanData = Object.keys(data.customer[0]).some((key) => {
        return data.customer[0][key]
          ?.toString()
          .toLowerCase()
          .includes(searchKey);
      });
      return scanData;
    });
  }

  filteredData.sort((x, y) => {
    return y.datetime - x.datetime;
  });
  res.json({ filteredData });
});

app.patch("/api/customer/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const {
      name,
      email,
      mobile,
      address,
      dob,
      bloodGroup,
      gender,
      emergencyContactMobile1,
      emergencyContactMobile2,
      emergencyContactName1,
      emergencyContactName2,
    } = req.body;
    var customer = await Customers.find({ _id: id });
    var ec1 = {};
    var ec2 = {};
    var updateObj = {};

    // if(emergencyContactMobile1!=='' && emergencyContactName1!==''){
    //   ec1.name=emergencyContactName1,
    //   ec1.contact=emergencyContactMobile1
    // }
    // if(emergencyContactMobile2!=='' && emergencyContactName2!==''){
    //   ec2.name=emergencyContactName2,
    //   ec2.contact=emergencyContactMobile2
    // }

    if (name !== "") updateObj.name = name;
    if (email !== "") updateObj.email = email;
    if (mobile !== "") updateObj.mobile = mobile;
    if (address !== "") updateObj.address = address;
    if (dob !== "") updateObj.dob = new Date(dob);
    if (bloodGroup !== "") updateObj.bloodGroup = bloodGroup;
    if (gender !== "") updateObj.gender = gender;

    if (emergencyContactName1 !== "")
      updateObj.emergencyContactName1 = emergencyContactName1;
    if (emergencyContactMobile1 !== "")
      updateObj.emergencyContactMobile1 = emergencyContactMobile1;

    if (emergencyContactName2 !== "")
      updateObj.emergencyContactName2 = emergencyContactName2;
    if (emergencyContactMobile2 !== "")
      updateObj.emergencyContactMobile2 = emergencyContactMobile2;

    await Customers.updateOne({ _id: id }, { $set: updateObj });

    res.json({ customer, updateObj, message: "successfully updated" });
  } catch (error) {
    res.json({ message: error.message });
  }
});

app.listen((PORT = process.env.PORT), () => {
  console.log("server started");
});
