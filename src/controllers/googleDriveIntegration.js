const { google } = require('googleapis');
const oAuth2Client = require('../config/googleConfig');
const scopes = ['https://www.googleapis.com/auth/drive'];
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const uploadsDir = path.join(__dirname, '../../uploads');
const WordExtractor = require('word-extractor');
const mysqlPool = require('../db/db');
const officeParser = require('officeparser');
const pdfParse = require('pdf-parse');

// Generate the authentication URL
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  include_granted_scopes: true,
});

// Get the authentication URL
const getAuthUrl = (req, res) => {
  try {
    res.status(200).send(authUrl);
  } catch (error) {
    console.log(error, 'auth url');
    res.send(error);
  }
};

// Handle the callback from the authentication flow
const redirectToUpload = async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync('tokens.json', JSON.stringify(tokens));
    res.send('Authentication successful!');
  } catch (error) {
    console.error('Error authenticating:', error);
    res.status(500).send('Authentication failed.');
  }
};

//load tokens
const loadTokens = () => {
  try {
    const tokens = JSON.parse(fs.readFileSync('tokens.json'));
    oAuth2Client.setCredentials(tokens);
    console.log('Tokens saved:', tokens);

    return google.drive({ version: 'v3', auth: oAuth2Client });
  } catch (error) {
    throw new Error('Tokens not found or invalid.');
  }
};

// upload files to server
const downloadFileFromDrive = async (fileId, filePath,link) => {
  try {
    let accessToken=' ';
    const response = await axios({
      url: link,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      responseType: 'stream',
    });
    const blob = new Blob([response.data], { type: response.headers['content-type'] });
    // console.log(blob,"blob")
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        // Check the file size
        fs.promises
          .stat(filePath)
          .then((stats) => {
            if (stats.size > 0) {
              resolve(filePath);
            } else {
              reject(new Error('File is empty'));
            }
          })
          .catch(reject);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }
};

// Example usage
const handleFileUploadCheckWords = async (req, res) => {
  const { fileName, fileId, mimetype,link } = req.body;
  // console.log({ fileName, fileId, mimetype }, 'abcd');
  const filePath = path.join(uploadsDir, fileName);

  try {
    await downloadFileFromDrive(fileId, filePath,link);
    // console.log('File downloaded and saved to', filePath);

    const docDetails = await wordCountsFromStringAndDoc(
      fileName,
      filePath,
      mimetype
    );

    res.json({
      docDetails,
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.json({
      message: error,
    });
  }
};

// handle prrofreading file into memory from google drive
const fileUploadFromDrive = async (req, res) => {
  const {
        userId,
        documentType,
        documentSubject,
        selectLanguage,
        notes,
        selectServices,
        fileName,
        deliveryDate,
        cost,
  } = req.body;

  const filePath = path.join(uploadsDir, fileName);

  try {
    // await downloadFileFromDrive(fileId, filePath);
    const docDetails = await uploadDocAndStringForProofReadingEditing(
      userId,
      documentType,
      documentSubject,
      selectLanguage,
      notes,
      selectServices,
      deliveryDate,
      cost,
      filePath,
      fileName
    );
    res.json({
      docDetails,
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(400).JSON;
  }
};

const uploadDocAndStringForProofReadingEditing = async (
  userId,
  documentType,
  documentSubject,
  selectLanguage,
  notes,
  selectServices,
  deliveryDate,
  cost,
  filePath,
  fileName
) => {
  try {
    const [response] = await mysqlPool.query(
      `INSERT INTO proofReadingEditing (userId,documentType,documentSubject,selectLanguage,notes,selectServices,filePath,fileName,deliveryDate,cost) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        userId,
        documentType,
        documentSubject,
        selectLanguage,
        notes,
        selectServices,
        filePath,
        fileName,
        deliveryDate,
        +cost,
      ]
    );
    return response;
  } catch (error) {
    return error;
  }
};

// count data from text file
function countWordsInTextFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      // Count words in the text content
      const wordCount = countWordsInText(data);
      resolve(wordCount);
    });
  });
}

function countWordsInText(text) {
  // Count words using a regex or other suitable method
  const words = text.split(/\b\S+\b/g);
  return words.length;
}

// This endpoint will receive submitted text and file to be checked for words count
const wordCountsFromStringAndDoc = async (fileName, filePath, mimetype) => {
  // console.log(filePath, mimetype, 'filePath');
  try {
    var docDetails = {
      noOfChars: 0,
      noOfPages: 0,
    };
    var wordCount;
    if (mimetype === 'application/msword') {
      const extractor = new WordExtractor();
      const extracted = extractor.extract(filePath);
      await extracted.then(function (doc) {
        wordCount = doc.getBody().length;
      });
    } else if (mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath); // Read the PDF file as a buffer
      const pdfData = await pdfParse(dataBuffer);
      const textData = pdfData.text;
      wordCount = textData.split(/\b\S+\b/).length;
      // console.log(`Total word count in PDF: ${wordCount}`);
    } else if (mimetype === 'text/plain') {
      await countWordsInTextFile(filePath).then((data) => {
        wordCount = data;
        // console.log(`Total word count in text file: ${wordCount}`);
      });
    } else {
      const data = await officeParser.parseOfficeAsync(filePath);
      // console.log(data, 'data');
      const textData = data.toString();
      wordCount = textData.split(/\b\S+\b/g).length;
    }
    docDetails = {
      noOfChars: wordCount,
      fileName,
    };
    // console.log({ noOfChars: wordCount, fileName }, 'aalu pyaz');
    return { noOfChars: wordCount, fileName };
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = {
  getAuthUrl,
  redirectToUpload,
  handleFileUploadCheckWords,
  fileUploadFromDrive,
};
