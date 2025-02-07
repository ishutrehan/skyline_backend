const { config } = require('dotenv');
const isSuccessStatusCode = require('../utils/statusCode');
const { default: axios } = require('axios');
const mysqlPool = require('../db/db');
const mailTemplate = require('../middleware/mailTemplate');
var accessToken = null;
const sendMailFunction = require('../utils/nodemailer');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');

const imageBuffer = fs.readFileSync(
  path.join(__dirname, '../../home/upload/banner2.png')
);
const base64Image = imageBuffer.toString('base64');

// login in copyleaks
const loginCopyLeaks = async () => {
  try {
    // const loginUrl = `${config.env.COPYLEAKS_LOGIN_BASE_URL}/v3/account/login/api`;
    const loginUrl = `https://id.copyleaks.com/v3/account/login/api`;

    const response = await axios.post(
      loginUrl,
      // { key: config.env.APIKEY, email: config.env.EMAILID },
      {
        key: '537cea13-ed11-42b4-90f2-a0426132256a',
        email: 'skylinechatgpt@gmail.com',
      },

      {
        'Content-Type': 'application/json',
        'User-Agent': ' node-sdk/3.0',
      }
    );
    if (isSuccessStatusCode(response.status)) {
     
      accessToken = response.data;
      return response.data;
    }
  } catch (error) {
    throw new Error(error);
  }
};

// verify token
const verifyToken = async (authToken) => {
  try {
    console.log(authToken, 'authtoken');
    if (authToken === null) {
      return false;
    }
    const currentDate = new Date(Date.now());
    currentDate.setMinutes(currentDate.getMinutes() + 5);
    const expireTokenTime = new Date(authToken['.expires']);
    if (expireTokenTime.getTime() <= currentDate.getTime()) {
      return false;
    }
    return true;
  } catch (error) {
    throw new Error(error);
  }
};

// ai content detection (receive submitted text/pdf to be checked)
const aiContentDetection = async (value, scanId) => {
  console.log('first');
  // const url = `${config.env.COPYLEAKS_API_BASE_URL}/v2/writer-detector/${scanId}/check`;
  const tokenValidation = await verifyToken(accessToken);
  if (tokenValidation === false) {
    await loginCopyLeaks();
  }

  const options = {
    method: 'POST',
    url: `https://api.copyleaks.com/v2/writer-detector/${scanId}/check`,
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    data: {
      text: value,
    },
  };
  try {
    console.log(options, 'options');
    const { data } = await axios.request(options);
    console.log(data);
    return data;
  } catch (error) {
    console.log(error, 'error');
  }
};

// removes the logo from pdf header
async function removeScanReportLogo(pdfFileAddress) {
  const existingPdfBytes = fs.readFileSync(
    // path.join(__dirname, '../../home/upload/user-1726657237446report.pdf')
    path.join(pdfFileAddress)
  );
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const pages = pdfDoc.getPages();

  pages.map(async (page, i) => {
    if (pages.length - 1 === i) {
      return;
    }
    const red = 247 / 255;
    const green = 247 / 255;
    const blue = 247 / 255;

    page.drawRectangle({
      x: 10,
      y: 0,
      width: 250,
      height: 60,
      color: rgb(red, green, blue),
    });
  });
  const modifiedPdfBytes = await pdfDoc.save();
  fs.writeFileSync(`${pdfFileAddress}`, modifiedPdfBytes);
}

// plagairism detection with result;
const plagiarismDetect = async (
  value,
  scanId,
  fileName,
  userId,
  ContentDetection
) => {
  console.log('second');
  // const url = `${config.env.COPYLEAKS_API_BASE_URL}/v2/writer-detector/${scanId}/check`;
  const tokenValidation = await verifyToken(accessToken);
  if (tokenValidation === false) {
    await loginCopyLeaks();
  }
  const options = {
    method: 'PUT',
    url: `https://api.copyleaks.com/v3/scans/submit/file/${scanId}`,
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    data: {
      base64: value,
      filename: fileName,
      properties: {
        aiGeneratedText: {
          detect: ContentDetection,
        },
        pdf: {
          create: true,
          title: `Report-of-${fileName}`,
          largeLogo: base64Image,
        },
        includeHtml: true,
        webhooks: {
          status: `${process.env.BASE_URL}/api/scan/copyleaks/${userId}/completed/${scanId}`,
          // status: `https://copylekas-webhooks.onrender.com/copyleaks/{STATUS}/${scanId}`,
        },
      },
    },
  };
  
  try {
    const { data } = await axios.request(options);
    const message = 'PDF Report is Available'
    await mysqlPool.query(
      'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
      [message, userId, 0]
    );
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
    return error;
  }
};

const plagiarismDetectionForImages = async (
  value,
  scanId,
  fileName,
  userId,
  ContentDetection,
  selectedLanguage
) => {
  const tokenValidation = await verifyToken(accessToken);
  if (tokenValidation === false) {
    await loginCopyLeaks();
  }

  console.log('base64 image: ' + base64Image);
  const options = {
    method: 'PUT',
    url: `https://api.copyleaks.com/v3/scans/submit/ocr/${scanId}`,
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    data: {
      base64: value,
      filename: fileName,
      langCode: selectedLanguage,
      properties: {
        action: 0,
        author: { id: 'Author id' },
        exclude: { quotes: false, titles: false, htmlTemplate: false },
        aiGeneratedText: {
          detect: ContentDetection,
        },
        pdf: {
          create: true,
          title: `Report-of-${fileName}`,
          largeLogo: base64Image,
        },
        includeHtml: true,
        filters: {
          domains: ['www.example.com'],
          safeSearch: false,
          domainsMode: 1,
          minCopiedWords: 10,
          identicalEnabled: true,
          minorChangesEnabled: true,
          relatedMeaningEnabled: true,
        },
        sandbox: true,
        scanning: { internet: true },
        webhooks: {
          status: `${process.env.BASE_URL}/api/scan/copyleaks/${userId}/completed/${scanId}`,
          // newResult: 'https://yoursite.com/webhook/new-result'
        },
        expiration: 480,
        includeHtml: false,
        developerPayload: 'Custom developer payload',
        sensitivityLevel: 3,
      },
    },
  };

  try {
    const { data } = await axios.request(options);

    const message = 'File scanned successfully'
    await mysqlPool.query(
      'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
      [message, userId, 0]
    );
   
    console.log(data);
  } catch (error) {
    console.error(error);
  }
};
// webhookStatus (first webhook result (create complete.json))
const webhookScanStatus = async (req, res) => {
  try {
    console.log('abcd');
    const { status, scanId, userId } = req.params;
    console.error(`Webhook called for scanId: ${scanId} and STATUS: ${status}`);
    const data = req.body;

    // create a json file (complete.json)
    // Define the path and filename for the JSON file
    const filePath = path.join(
      '/home/root/public_html/backend',
      // __dirname,
      // '..',
      // '..',
      'scanDoc',
      userId.toString(),
      scanId.toString(),
      'complete.json'
    );

    // Ensure the directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Write the data to the JSON file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    const { scannedDocument, results, notifications } = data;

    console.log(scannedDocument);
    console.log(results);
    console.log(notifications);

    var probabilityValue = 0;
    var humanValue = 0;
    var aiValue = 0;
    if (notifications.alerts.length > 0 && notifications.alerts) {
      const dataForProbability = notifications.alerts[0].additionalData;
      let dataExtractedForProbabilty;

      if (dataForProbability) {
        dataExtractedForProbabilty = JSON.parse(dataForProbability);
      }

      probabilityValue = dataExtractedForProbabilty?.results[0]?.probability;
      humanValue = dataExtractedForProbabilty?.summary?.human;
      aiValue = dataExtractedForProbabilty?.summary?.ai;
    }

    // const { scanId } = scannedDocument;
    const { score, internet } = results;
    const {
      identicalWords,
      minorChangedWords,
      relatedMeaningWords,
      aggregatedScore,
    } = score;

    const [res1] = await mysqlPool.query(
      `INSERT INTO scanScore(scanId,identicalWords,minorChangedWords,relatedMeaningWords,aggregatedScore,aiScore,humanScore,probabilityAIContent) VALUES(?,?,?,?,?,?,?,?)`,
      [
        scanId,
        identicalWords,
        minorChangedWords,
        relatedMeaningWords,
        aggregatedScore,
        aiValue,
        humanValue,
        probabilityValue,
      ]
    );

    internet.forEach(async (data) => {
      const { url, id, title, introduction } = data;
      const [res2] = await mysqlPool.query(
        `INSERT INTO scanResult(scanId,url,id,title,introduction) VALUES(?,?,?,?,?)`,
        [scanId, url, id, title, introduction]
      );
    });

    console.error(`Webhook called for scanId: ${scanId} and STATUS: ${status}`);
    await exportResult(scanId, userId);
    res.json({
      message: `Webhook called for scanId: ${scanId} and STATUS: ${status}`,
      data,
    });
  } catch (error) {
    res.json({
      error,
    });
    console.log(error);
  }
};

// show scan internet results
const showScanResults = async (req, res) => {
  try {
    const scanId = req.params.id;
    const [scanResults] = await mysqlPool.query(
      'SELECT * FROM scanResult WHERE scanId =?',
      [scanId]
    );
    res.json({
      scanResults,
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({
      message: error.message,
    });
  }
};

// show scan scores
const showScanScore = async (req, res) => {
  try {
    const scanId = req.params.id;
    const [scanScore] = await mysqlPool.query(
      'SELECT * FROM scanScore WHERE scanId =?',
      [scanId]
    );
    res.json({
      scanScore,
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({
      message: error.message,
    });
  }
};

const generateUniqueExportId = () => {
  return `export-${Date.now().toString()}`;
};
// export the results from scan internet data
const exportResult = async (scanId, userId) => {
  await exportScanResultApi(scanId, userId);
};

// second and third webhooks call
const exportScanResultApi = async (scanId, userId) => {
  /** [
        {
          id: '05f56c01e3',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/05f56c01e3',
        },
        {
          id: '28aece8d04',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/28aece8d04',
        },
        {
          id: '4c3dd74486',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/4c3dd74486',
        },
        {
          id: '4ddc8c554e',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/4ddc8c554e',
        },
        {
          id: '4ecba5e745',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/4ecba5e745',
        },
        {
          id: '6f6c8cb59a',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/6f6c8cb59a',
        },
        {
          id: '729d16a628',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/729d16a628',
        },
        {
          id: '75da777366',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/75da777366',
        },
        {
          id: 'a6b1a1bb78',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/a6b1a1bb78',
        },
        {
          id: 'b923ed0aee',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/b923ed0aee',
        },
        {
          id: 'bf8f976ff9',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/bf8f976ff9',
        },
        {
          id: 'c478b30b05',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/c478b30b05',
        },
        {
          id: 'cfa1a4826c',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/cfa1a4826c',
        },
        {
          id: 'ecc3e4c8b2',
          verb: 'POST',
          endpoint:
            'https://copylekas-webhooks.onrender.com/copyleaks/export/export5432123/results/ecc3e4c8b2',
        },
      ], */
  const exportId = await generateUniqueExportId();
  const tokenValidation = await verifyToken(accessToken);
  if (tokenValidation === false) {
    await loginCopyLeaks();
  }
  const [resultData, meta] = await mysqlPool.query(
    'SELECT * FROM scanResult WHERE scanId=?',
    [scanId]
  );

  const resultArr = resultData.map((row) => {
    return {
      id: row['id'],
      verb: 'POST',
      // endpoint: `https://copylekas-webhooks.onrender.com/copyleaks/export/${exportId}/results/${row['id']}`,
      endpoint: `${process.env.BASE_URL}/api/scan/copyleaks/export/${userId}/${scanId}/${exportId}/results/${row['id']}`,
    };
  });

  const options = {
    method: 'POST',
    url: `https://api.copyleaks.com/v3/downloads/${scanId}/export/${exportId}`,
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`,
      'Content-Type': 'application/json',
    },
    data: {
      results: resultArr,
      pdfReport: {
        verb: 'POST',
        headers: [['header-key', 'header-value']],
        // endpoint: `https://copylekas-webhooks.onrender.com/copyleaks/export/${exportId}/pdf-report`,
        endpoint: `${process.env.BASE_URL}/api/scan/copyleaks/export/${exportId}/${scanId}/pdf-report`,
      },
      maxRetries: 3,
      crawledVersion: {
        verb: 'POST',
        headers: [['header-key', 'header-value']],
        endpoint: `${process.env.BASE_URL}/api/scan/copyleaks/export/${userId}/${scanId}/${exportId}/crawled-version`,
      },
      // completionWebhook: `https://copylekas-webhooks.onrender.com/copyleaks/export/${exportId}/completed`,
      completionWebhook: `${process.env.BASE_URL}/api/scan/copyleaks/export/${exportId}/completed`,
    },
  };

  try {
    const { data } = await axios.request(options);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
};

// webhook export result completion
const resultCompletionWebhook = async (req, res) => {
  try {
    console.log('export completed webhook called');
    const { export_id, status } = req.params;
    console.log({ export_id, status });
    const body = req.body;
    console.log(JSON.stringify(body));
    res.send(
      `Webhook called for export_id: ${export_id} and status: ${status}`
    );
  } catch (error) {
    console.log(error, 'error');
    res.json({
      error,
    });
  }
};

// webhook export result(it will show data)
const resultWebhook = async (req, res) => {
  try {
    console.log('result webhook called');
    const { export_id, result_id, userId, scanId } = req.params;

    // create a json file (complete.json)
    // Define the path and filename for the JSON file
    const filePath = path.join(
      '/home/root/public_html/backend',
      // __dirname,
      // '..',
      // '..',
      'scanDoc',
      userId.toString(),
      scanId.toString(),
      'Result',
      `${result_id}.json`
    );
    const detailedData = req.body;
    // Ensure the directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Write the data to the JSON file
    fs.writeFileSync(filePath, JSON.stringify(detailedData, null, 2), 'utf-8');

    // add data in database for colouring
    const {
      text: {
        comparison: {
          identical: {
            source: { chars: identicalChars },
          },
          relatedMeaning: {
            source: { chars: paraphrased },
          },
        },
      },
    } = req.body;

    const data = JSON.stringify(identicalChars);
    const data1 = JSON.stringify(paraphrased);
    const [response] = await mysqlPool.query(
      `INSERT INTO identicalResults (exportId,resultId,identicalData,relatedMeaning) VALUES(?,?,?,?)`,
      [export_id, result_id, data, data1]
    );
    res.send(
      `Webhook called for export_id: ${export_id} and result_id: ${result_id}`
    );
  } catch (error) {
    console.log(error, 'error');
    res.json({
      error,
    });
  }
};

const pdfResultWebhook = async (req, res) => {
  console.error('result pdf webhook called==============================');

  const { export_id, scanId } = req.params;
  const headers = req.headers;
  await mysqlPool.query(
    `UPDATE identicalResults SET pdfReportPath=? WHERE exportId=?`,
    [
      `/home/root/public_html/backend/uploads/${export_id}.pdf`,
      export_id,
    ]
  );
  // Log request headers
  console.error(headers);
  try {
    if (headers['content-type'] !== 'application/pdf') {
      return res
        .status(400)
        .send('Invalid content type. Expected application/pdf');
    }

    // Define the path to save the PDF
    const pdfFilePath = path.join(
      '/home/root/public_html/backend',
      'uploads',
      `${scanId + 'report'}.pdf`
    );
    console.error(pdfFilePath, 'path');
    // Create a write stream to save the PDF
    const writeStream = fs.createWriteStream(pdfFilePath);

    // Pipe the request stream to the write stream
    req.pipe(writeStream);

    // Handle stream events
    writeStream.on('finish', () => {
      console.log(`PDF file saved successfully: ${pdfFilePath}`);
      res.send(`Webhook called for export_id ${export_id}, file received`);
      removeScanReportLogo(pdfFilePath);
    });

    writeStream.on('error', (err) => {
      console.error('Error writing file:', err);
      res.status(500).send('Error saving file');
    });
  } catch (error) {
    console.error(error, 'error');
  }
};

// crawled version
const crawledVersionResult = async (req, res) => {
  console.error('export crawled version completed webhook called');
  const { userId, scanId } = req.params;
  const body1 = req.body;

  // create a json file (source.json)
  // Define the path and filename for the JSON file
  const filePath = path.join(
    '/home/root/public_html/backend',
    // __dirname,
    // '..',
    // '..',
    'scanDoc',
    userId.toString(),
    scanId.toString(),
    'source.json'
  );

  // Ensure the directory exists
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  // Write the data to the JSON file
  fs.writeFileSync(filePath, JSON.stringify(body1, null, 2), 'utf-8');
  console.error(JSON.stringify(body1));
  res.send(`Webhook crawled version called for export_id`);
};
// test
async function storeResult(req, res) {
  const export_id = 'export5432123';
  const result_id = 'ecc3e4c8b22';
  const {
    text: {
      comparison: {
        identical: {
          source: { chars },
        },
        relatedMeaning: {
          source: { chars: paraphrased },
        },
      },
    },
  } = req.body;
  const data = JSON.stringify(chars);
  const data1 = JSON.stringify(paraphrased);

  const [response] = await mysqlPool.query(
    `INSERT INTO identicalResults (exportId,resultId,identicalData,relatedMeaning) VALUES(?,?,?,?)`,
    [export_id, result_id, data, data1]
  );
  // console.log(data, 'identical');
}

// get result,identical char data and all with scan id (join two tables scanResult and identicalResult)
const finalIdenticalCharsData = async (req, res) => {
  try {
    const scanId = req.params.id;
    const [response] = await mysqlPool.query(
      `SELECT sr.*, ir.*
    FROM scanResult sr
    JOIN identicalResults ir ON sr.id = ir.resultId WHERE sr.scanId=?;
    `,
      [scanId]
    );

    const data = response.map((data, index) => {
      // error.log(data.identicalData);
      return JSON.parse(data.identicalData);
    });
    const data1 = response.map((data, index) => {
      // error.log(data.relatedMeaning);
      return JSON.parse(data.relatedMeaning);
    });

    const reportPath = response.map((data, index) => {
      return data.pdfReportPath;
    });
    const pdfReportPathIs = reportPath[0];
    res.json({
      data,
      data1,
      pdfReportPathIs,
    });
  } catch (error) {
    console.log(error);
    res.json({
      error,
    });
  }
};

const uploadingStatus = async (req, res) => {
  try {
    
    console.log('file uploaded successfully');
    res.status(200).json({
      message: 'file uploaded successfully',
    });
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
};

// share link on mail id
const mailTransfer = async (req, res) => {
  try {
    const { email, link } = req.body;
    const mailDetails = {
      from: 'support@skylineacademic.com',
      to: email,
      subject: 'Scan Report Request',
      html: newMailTemplate(link),
      bcc: 'support@skylineacademic.com',
    };
    const mail = await sendMailFunction(mailDetails);
    if (mail) {
      res.json({
        message: `mail send to ${email}`,
      });
    }
  } catch (error) {
    console.error(error);
    res.json({
      error: `mail is not sending ${error}`,
    });
  }
};
function newMailTemplate(link) {
  let message = '';
  if (link.length > 1 && Array.isArray(link)) {
    for (let i = 0; i < link.length; i++) {
      message += link[i] + '<br>';
    }
  } else {
    message = link;
  }
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Scan Report</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        // padding: 20px;
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
    <p>${message}</p>
    </div>
  </body>
  </html>
    `;
}

const downloadPdfReport = async (req, res) => {
  // const filePath = '/home/root/public_html/backend/uploads/export070707079.pdf';
  try {
    var filePath = `uploads/${req.body.filePath}report.pdf`;
    const fileName = path.basename(filePath);

    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error('File does not exist', err);
        return res.status(404).end();
      }

      // Stream the file to the client
      const fileStream = fs.createReadStream(filePath);
      res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
      res.setHeader('Content-type', 'application/pdf');

      fileStream.pipe(res);
    });
  } catch (error) {
    console.log(error, 'error');
    res.json({
      error,
    });
  }
};

// get source file (crawled version)
const getSourceFile = async (req, res) => {
  try {
    const { userId, scanId } = req.params;
    const filePath = path.join(
      '/home/root/public_html/backend',
      // __dirname,
      // '..',
      // '..',
      'scanDoc',
      userId,
      scanId,
      'source.json'
    );

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read and send the JSON file
    const jsonData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(jsonData);

    res.json(data);
  } catch (error) {
    res.json({
      error,
    });
  }
};

// get complete.file (scanned data file)
const getCompleteFile = async (req, res) => {
  try {
    const { userId, scanId } = req.params;
    const filePath = path.join(
      '/home/root/public_html/backend',
      // __dirname,
      // '..',
      // '..',
      'scanDoc',
      userId,
      scanId,
      'complete.json'
    );

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read and send the JSON file
    const jsonData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(jsonData);

    res.json(data);
  } catch (error) {
    res.json({
      error,
    });
  }
};

// const getResultsFile (it will with result if)
const getResultsFile = async (req, res) => {
  try {
    const { userId, scanId, id } = req.params;
    const filePath = path.join(
      '/home/root/public_html/backend',
      // __dirname,
      // '..',
      // '..',
      'scanDoc',
      userId,
      scanId,
      'Result',
      `${id}`
    );
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    // Read and send the JSON file
    const jsonData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(jsonData);

    res.json(data);
  } catch (error) {
    res.json({
      error,
    });
  }
};

async function deleteFromCopyLeaks(scanIds) {
  const tokenValidation = await verifyToken(accessToken);
  if (tokenValidation === false) {
    await loginCopyLeaks();
  }
  let scansResults = [];
  scanIds.map((data) => {
    scansResults.push({ id: data });
  });
  const options = {
    method: 'PATCH',
    url: 'https://api.copyleaks.com/v3.1/scans/delete',
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    data: {
      purge: false,
      // scans: [{ id: 'Your-scan-id-1' }, { id: 'Your-scan-id-2' }],
      scans: scansResults,
    },
  };

  try {
    const { data } = await axios.request(options);
    return data;
  } catch (error) {
    console.error(error);
    return error;
  }
}
const deleteDirectories = (userId, scanIds) => {
  console.log(typeof scanIds);
  scanIds.forEach((scanId) => {
    const directoryPath = path.join(
      '/home/root/public_html/backend',
      'scanDoc',
      userId.toString(),
      scanId.toString()
    );

    fs.rm(directoryPath, { recursive: true, force: true }, (err) => {
      if (err) {
        console.error(`Error deleting directory ${directoryPath}:`, err);
      } else {
        console.log(`Successfully deleted directory ${directoryPath}`);
      }
    });
  });
  return;
};

const removeScanResult = async (req, res) => {
  try {
    const { scanIds, userId } = req.body;
    console.log(typeof scanIds, 'scanIds:');
    // delete from copyleaks
    await deleteFromCopyLeaks(scanIds);

    // delete from scan store
    const placeholders = scanIds.map(() => '?').join(',');
    const query1 = `DELETE FROM scans WHERE scanId IN (${placeholders})`;
    const [result1] = await mysqlPool.query(query1, scanIds);

    // delete from scanScore store
    const query2 = `DELETE FROM scanScore WHERE scanId IN (${placeholders})`;
    const [result2] = await mysqlPool.query(query2, scanIds);

    // delete from scanDoc folder
    // it need userId->scanId
    // fill will be found here
    await deleteDirectories(userId, scanIds);
    res.status(200).json({
      message: 'Files deleted successfully',
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({
      message: 'Error deleting',
    });
  }
};
module.exports = {
  loginCopyLeaks,
  aiContentDetection,
  verifyToken,
  webhookScanStatus,
  plagiarismDetect,
  showScanResults,
  showScanScore,
  exportResult,
  resultCompletionWebhook,
  resultWebhook,
  storeResult,
  finalIdenticalCharsData,
  uploadingStatus,
  mailTransfer,
  pdfResultWebhook,
  crawledVersionResult,
  downloadPdfReport,
  getSourceFile,
  getCompleteFile,
  getResultsFile,
  removeScanResult,
  plagiarismDetectionForImages,
};

// router.post('/copyleaks/:status/:scanId',(req,res) => {
//   console.log('status webhook called')
//   const {status,scanId} = req.params;
//   console.log({status,scanId});
//   const {results} = req.body;
//   console.log(JSON.stringify(results));
//   res.send(`Webhook called for scanId: ${scanId} and STATUS: ${status}`);
// })
