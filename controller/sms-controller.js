const { SNSClient } = require("@aws-sdk/client-sns");
const { PublishCommand } = require("@aws-sdk/client-sns");

// Set the AWS Region.
const REGION = process.env.AWS_REGION; //e.g. "us-east-1"
// Create SNS service object.
const snsClient = new SNSClient({ region: REGION });

exports.sendSms = async (req, res) => {
  const { messageArray } = req.body;
  const messages = [];
  messageArray.forEach((curr) => {
    const obj = { Message: "", PhoneNumber: "" };

    // number
    if (curr.number[0] !== "+") {
      return res.status(442).json({
        ok: false,
        msg: "The phone number should be in proper E.164 format",
      });
    } else {
      obj.PhoneNumber = curr.number;
    }
    // message
    obj.Message = curr.message;

    // final message array
    messages.push(obj);
  });

  try {
    const promises = [];
    messages.forEach((curr) => {
      promises.push(snsClient.send(new PublishCommand(curr)));
    });

    const result = await Promise.all(promises);

    res.json({ ok: true, data: result });
  } catch (err) {
    console.log(err);
  }
};

exports.sendMessgeToSubs = async (req, res) => {
  const { message } = req.body;

  var params = {
    Message: message,
    TopicArn: "arn:aws:sns:ap-northeast-1:808733812225:Wesafe-SMS",
  };

  try {
    const data = await snsClient.send(new PublishCommand(params));
    res.json({ ok: true, data });
  } catch (err) {
    console.log("Error", err.stack);
  }
};
