const nodemailer = require('nodemailer');

const mailTransporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com', // Hostinger's SMTP server
  port: 465, // Secure port for SMTP with SSL/TLS
  secure: true, // Use SSL/TLS
  auth: {
    user: 'support@skylineacademic.com', // Your Hostinger email
    pass: 'P|pT@/>=1f' // Password for the Hostinger email account
  }
});

async function sendMailFunction(mailOption) {
  try {
    const mailer = await mailTransporter.sendMail(mailOption);
    return mailer;
  } catch (error) {
    throw error;
  }
}
module.exports = sendMailFunction