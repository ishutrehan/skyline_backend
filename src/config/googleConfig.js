const { google } = require('googleapis');

const oAuth2Client = new google.auth.OAuth2(
 
  (redirectUri = 'http://localhost:5173/callback')
);

module.exports = oAuth2Client;
