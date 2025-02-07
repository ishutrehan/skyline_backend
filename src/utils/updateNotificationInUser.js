const mysqlPool = require('../db/db');
const {
  mailTemplateForNotificationOnEmail,
} = require('../middleware/mailTemplate');
const sendMailFunction = require('./nodemailer');
function mailDetail(email, type) {
  return {
    to: email,
    subject: `Details About Your Last ${type} Document`,
    html: mailTemplateForNotificationOnEmail(type),
  };
}
const updateForAssignmentNotifictionInUser = async (orderId, purpose) => {
  const [orderDetails] = await mysqlPool.query(
    `SELECT * FROM orders where orderId=?`,
    [orderId]
  );
  const userId = orderDetails[0].userId;
  console.log(userId, 'userId');
  const [userDetails] = await mysqlPool.query(
    'SELECT * FROM users WHERE userId=?',
    [userId]
  );
  console.log(userDetails, 'userDetails');

  const mailOption = await mailDetail(userDetails[0].email, purpose);
  await sendMailFunction(mailOption);
  const [notificationThen] = await mysqlPool.query(
    `SELECT * FROM users where userId=?`,
    [userId]
  );
  let notificationval = notificationThen[0].notification + 1;
  const [updatedUser] = await mysqlPool.query(
    'UPDATE users SET notification =? where userId=?',
    [notificationval, userId]
  );
  return;
};
const updateForProofreadingNotifictionInUser = async (
  proofReadingId,
  purpose
) => {
  const [orderDetails] = await mysqlPool.query(
    `SELECT * FROM proofReadingEditing where proofReadingId=?`,
    [proofReadingId]
  );
  const userId = orderDetails[0].userId;
  const [userDetails] = await mysqlPool.query(
    'SELECT * FROM users WHERE userId=?',
    [userId]
  );
  const mailOption = await mailDetail(userDetails[0].email, purpose);
  await sendMailFunction(mailOption);
  const [notificationThen] = await mysqlPool.query(
    `SELECT * FROM users where userId=?`,
    [userId]
  );
  let notificationval = notificationThen[0].notification + 1;
  const [updatedUser] = await mysqlPool.query(
    'UPDATE users SET notification =? where userId=?',
    [notificationval, userId]
  );
  return;
};

module.exports = {
  updateForAssignmentNotifictionInUser,
  updateForProofreadingNotifictionInUser,
};
