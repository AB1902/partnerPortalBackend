const Visibility = require("./../models/Visibility");

const fields = [
  "emergencyContacts",
  "medicalCondition",
  "medication",
  "allergy",
  "vaccine",
  "procedure",
  "insurance",
  "document",
];

exports.getUserVisibility = async (req, res) => {
  try {
    const userId = req.params.userId;

    const target = await Visibility.find({ userId });

    console.log(target);
    if (target.length === 0) {
      return res.status(200).json({
        ok: true,
        data: {
          emergencyContacts: false,
          medicalCondition: false,
          medication: false,
          allergy: false,
          vaccine: false,
          procedure: false,
          insurance: false,
          document: false,
        },
      });
    } else {
      return res.status(200).json({ ok: true, data: target[0] });
    }
  } catch (err) {}
};

exports.updateAndAddUserVisibility = async (req, res) => {
  try {
    const { userId, type, value } = req.body;

    if (!fields.includes(type)) {
      return res.status(400).json({ ok: false, msg: "no such field" });
    }

    const target = await Visibility.find({ userId });

    if (target.length === 0) {
      const newDoc = Visibility({
        userId: userId,
        [type]: value,
      });

      await newDoc.save();
    } else {
      const finalObj = { [type]: value };
      await Visibility.findOneAndUpdate({ userId }, finalObj);
    }

    return res.status(200).json({ ok: true, msg: "operation successful" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ ok: false, msg: err?.message, err });
  }
};
