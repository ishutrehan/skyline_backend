function mailTemplate(link) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Scan Report</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 5px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      h2 {
        color: #333333;
      }
      p {
        color: #666666;
      }
    </style>
  </head>
  <body>
    <div class="container">
    <p>I hope this email finds you well.</p>
    <p>${link}</p>
    </div>
  </body>
  </html>
    `;
}

function mailTemplateForNotificationOnEmail(type) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Your ${type} Document</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 5px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      h2 {
        color: #333333;
      }
      p {
        color: #666666;
      }
    </style>
  </head>
  <body>
    <div class="container">
    <p>I hope this email finds you well.</p>
    <p>Your ${type} document is assigned by an admin to an editor.You can check in your dashboard</p>
    </div>
  </body>
  </html>
    `;
}

function mailTemplateForResetPassword(resetLink) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }
    h2 {
      color: #333;
    }
    .btn {
      display: inline-block;
      background-color: #007bff;
      color: #ffffff;
      padding: 12px 25px;
      text-decoration: none;
      border-radius: 5px;
      font-size: 16px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 30px;
      font-size: 14px;
      text-align: center;
      color: #777;
    }
    .footer a {
      color: #007bff;
      text-decoration: none;
    }
  </style>
</head>
<body>

  <div class="container">
    <h2>Password Reset Request</h2>
    <p>We received a request to reset your password. Please click the button below to reset your password:</p>
    <a href="${resetLink}" class="btn" target="_blank">Reset Password</a>

    <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>

    <div class="footer">
      <p>Thank you for using our service.</p>
      <p>If you have any questions, feel free to contact our support team.</p>
    </div>
  </div>

</body>
</html>
`;
}
module.exports = {
  mailTemplate,
  mailTemplateForNotificationOnEmail,
  mailTemplateForResetPassword,
};
