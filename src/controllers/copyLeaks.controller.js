const { config } = require("dotenv");
const isSuccessStatusCode = require("../utils/statusCode");
const { default: axios } = require("axios");
const mysqlPool = require("../db/db");
const mailTemplate = require("../middleware/mailTemplate");
var accessToken = null;
const sendMailFunction = require("../utils/nodemailer");
const path = require("path");
const { PDFDocument, rgb } = require("pdf-lib");
const fs = require("fs");
const puppeteer = require("puppeteer");
const archiver = require("archiver");
const pdf = require("html-pdf-node");
const MemoryStream = require("memorystream");
const { Console } = require("console");

const imageBuffer = fs.readFileSync(
  path.join(__dirname, "../../home/upload/blackBg.png")
);
const base64Image = imageBuffer.toString("base64");

// login in copyleaks
const loginCopyLeaks = async () => {
  try {
    // const loginUrl = `${config.env.COPYLEAKS_LOGIN_BASE_URL}/v3/account/login/api`;
    const loginUrl = `https://id.copyleaks.com/v3/account/login/api`;

    const response = await axios.post(
      loginUrl,
      // { key: config.env.APIKEY, email: config.env.EMAILID },
      {
        key: "537cea13-ed11-42b4-90f2-a0426132256a",
        email: "skylinechatgpt@gmail.com",
      },

      {
        "Content-Type": "application/json",
        "User-Agent": " node-sdk/3.0",
      }
    );
    if (isSuccessStatusCode(response.status)) {
      accessToken = response.data;
      console.log("login success", accessToken);
      return response.data;
    }
  } catch (error) {
    throw new Error(error);
  }
};

// verify token
const verifyToken = async (authToken) => {
  try {
    if (authToken === null) {
      return false;
    }
    const currentDate = new Date(Date.now());
    currentDate.setMinutes(currentDate.getMinutes() + 5);
    const expireTokenTime = new Date(authToken[".expires"]);
    if (expireTokenTime.getTime() <= currentDate.getTime()) {
      return false;
    }
    return true;
  } catch (error) {
    throw new Error(error);
  }
};

// ai content detection (receive submitted text/pdf to be checked)
// const aiContentDetection = async (value, scanId) => {
//   console.log('first');
//   // const url = `${config.env.COPYLEAKS_API_BASE_URL}/v2/writer-detector/${scanId}/check`;
//   const tokenValidation = await verifyToken(accessToken);
//   if (tokenValidation === false) {
//     await loginCopyLeaks();
//   }

//   const options = {
//     method: 'POST',
//     url: `https://api.copyleaks.com/v2/writer-detector/${scanId}/check`,
//     headers: {
//       Authorization: `Bearer ${accessToken.access_token}`,
//       'Content-Type': 'application/json',
//       Accept: 'application/json',
//     },
//     data: {
//       text: value,
//       pdf: {
//         create: true,
//         title: `Report-of-${scanId}`,
//         largeLogo: base64Image,
//       },
//     },
//   };
//   try {
//     console.log(options, 'options');
//     const { data } = await axios.request(options);
//     console.log(data);
//     return data;
//   } catch (error) {
//     console.log(error, 'error');
//   }
// };
const aiContentDetection = async (value, scanId,words) => {
  // const url = `${config.env.COPYLEAKS_API_BASE_URL}/v2/writer-detector/${scanId}/check`;
  const tokenValidation = await verifyToken(accessToken);
  if (tokenValidation === false) {
    await loginCopyLeaks();
  }
  
  const textvalue = value.replace(/\n/g, '');
  const options = {
    method: "POST",
    url: `https://api.copyleaks.com/v2/writer-detector/${scanId}/check`,
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: {
      text: textvalue,
      explain: true,
      sensitivity: 3,
    },
  };
  try {
    const { data } = await axios.request(options);
    console.log(value,'chekckt he osdojthecj====>')
    console.log(data, "ai data is ==================>");
    await generatePdfFromHtml(value, data, "AIpdf.html", scanId,words);
  } catch (error) {
    console.log(error, "error");
  }
};

// removes the logo from pdf header
async function removeScanReportLogo(pdfFileAddress) {
  const existingPdfBytes = fs.readFileSync(
    // path.join(__dirname, '../../home/upload/user-1726657237446Report.pdf')
    path.join(pdfFileAddress)
  );
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const pages = pdfDoc.getPages();

  // pages.map(async (page, i) => {
  //   if (pages.length - 1 === i) {
  //     return;
  //   }
  //   const red = 247 / 255;
  //   const green = 247 / 255;
  //   const blue = 247 / 255;

  //   page.drawRectangle({
  //     x: 10,
  //     y: 0,
  //     width: 250,
  //     height: 60,
  //     color: rgb(red, green, blue),
  //   });
  //   if (i === 1) {
  //     page.drawRectangle({
  //       x: page.getWidth() - 130,
  //       y: 155,
  //       width: 120,
  //       height: 150,
  //       color: rgb(red, green, blue),
  //     });
  //   }
  // });
  if (pages[0]) {
    const red = 247 / 255;
    const green = 247 / 255;
    const blue = 247 / 255;

    pages[0].drawRectangle({
      x: 10,
      y: 0,
      width: 250,
      height: 60,
      color: rgb(red, green, blue),
    });
  }

  // Process only the second page (index 1)
  if (pages[1]) {
    const red = 247 / 255;
    const green = 247 / 255;
    const blue = 247 / 255;

    pages[1].drawRectangle({
      x: 10,
      y: 0,
      width: 250,
      height: 60,
      color: rgb(red, green, blue),
    });

    pages[1].drawRectangle({
      x: pages[1].getWidth() - 130,
      y: 155,
      width: 120,
      height: 150,
      color: rgb(red, green, blue),
    });
  }
  const modifiedPdfBytes = await pdfDoc.save();
  fs.writeFileSync(`${pdfFileAddress}`, modifiedPdfBytes);
}

// plagairism detection with result;
const plagiarismDetect = async (
  value,
  scanId,
  fileName,
  userId,
  ContentDetection,
  pdfCreate
) => {
  // const url = `${config.env.COPYLEAKS_API_BASE_URL}/v2/writer-detector/${scanId}/check`;
  const tokenValidation = await verifyToken(accessToken);
  if (tokenValidation === false) {
    await loginCopyLeaks();
  }
  const options = {
    method: "PUT",
    url: `https://api.copyleaks.com/v3/scans/submit/file/${scanId}`,
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
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
    console.log("plagiarism data ", data,'plag data =====================>');
    const message = "PDF Report is Available";
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, userId, 0]
    );
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
  selectedLanguage,
  pdfCreate
) => {
  const tokenValidation = await verifyToken(accessToken);
  if (tokenValidation === false) {
    await loginCopyLeaks();
  }
  const options = {
    method: "PUT",
    url: `https://api.copyleaks.com/v3/scans/submit/ocr/${scanId}`,
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: {
      base64: value,
      filename: fileName,
      langCode: selectedLanguage,
      properties: {
        action: 0,
        author: { id: "Author id" },
        exclude: { quotes: false, titles: false, htmlTemplate: false },
        aiGeneratedText: {
          detect: ContentDetection,
        },
        pdf: {
          create: pdfCreate,
          title: `Report-of-${fileName}`,
          largeLogo: base64Image,
        },
        includeHtml: true,
        filters: {
          domains: ["www.example.com"],
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
        developerPayload: "Custom developer payload",
        sensitivityLevel: 3,
      },
    },
  };

  try {
    const { data } = await axios.request(options);

    const message = "File scanned successfully";
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, userId, 0]
    );
  } catch (error) {
    console.error(error);
  }
};
// webhookStatus (first webhook result (create complete.json))
const webhookScanStatus = async (req, res) => {
  try {
    const { status, scanId, userId } = req.params;
    const data = req.body;

    // create a json file (complete.json)
    // Define the path and filename for the JSON file
    const filePath = path.join(
      "/home/root/public_html/backend",
      // __dirname,
      // '..',
      // '..',
      "scanDoc",
      userId.toString(),
      scanId.toString(),
      "complete.json"
    );

    // Ensure the directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Write the data to the JSON file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    if (data) {
      const { scannedDocument, results, notifications } = data;
      var humanValue = 0;
      var aiValue = 0;
      if (notifications) {
        if (notifications.alerts.length > 0 && notifications.alerts) {
          const dataForProbability = notifications.alerts[0].additionalData;
          let dataExtractedForProbabilty;

          if (dataForProbability) {
            dataExtractedForProbabilty = JSON.parse(dataForProbability);
          }

          humanValue = dataExtractedForProbabilty?.summary?.human;
          aiValue = dataExtractedForProbabilty?.summary?.ai;
        }
      }
      // const { scanId } = scannedDocument;
      const { score, internet } = results;
      const {
        identicalWords,
        minorChangedWords,
        relatedMeaningWords,
        aggregatedScore,
      } = score;

      await mysqlPool.query(
        `INSERT INTO scanScore(scanId,identicalWords,minorChangedWords,relatedMeaningWords,aggregatedScore,aiScore,humanScore,probabilityAIContent) VALUES(?,?,?,?,?,?,?,?)`,
        [
          scanId,
          identicalWords,
          minorChangedWords,
          relatedMeaningWords,
          aggregatedScore,
          aiValue,
          humanValue,
          "--",
        ]
      );
      internet.forEach(async (data) => {
        const { url, id, title, introduction } = data;
        const [res2] = await mysqlPool.query(
          `INSERT INTO scanResult(scanId,url,id,title,introduction) VALUES(?,?,?,?,?)`,
          [scanId, url, id, title, introduction]
        );
      });

      console.error(
        `Webhook called for scanId: ${scanId} and STATUS: ${status}`
      );
      console.log(data,'may be plagiarism ka data ha i---->')
      await exportResult(scanId, userId);
      res.json({
        message: `Webhook called for scanId: ${scanId} and STATUS: ${status}`,
        data,
      });
    }
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
      "SELECT * FROM scanResult WHERE scanId =?",
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
      "SELECT * FROM scanScore WHERE scanId =?",
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
  const curr_user = await mysqlPool.query(
    "SELECT * FROM users WHERE userId=?",
    [userId]
  );
  const exportId = await generateUniqueExportId();
  const tokenValidation = await verifyToken(accessToken);
  if (tokenValidation === false) {
    await loginCopyLeaks();
  }
  const [resultData, meta] = await mysqlPool.query(
    "SELECT * FROM scanResult WHERE scanId=?",
    [scanId]
  );

  const resultArr = resultData.map((row) => {
    return {
      id: row["id"],
      verb: "POST",
      endpoint: `${process.env.BASE_URL}/api/scan/copyleaks/export/${userId}/${scanId}/${exportId}/results/${row["id"]}`,
    };
  });

  const options = {
    method: "POST",
    url: `https://api.copyleaks.com/v3/downloads/${scanId}/export/${exportId}`,
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`,
      "Content-Type": "application/json",
    },
    data: {
      results: resultArr,
      pdfReport: {
        verb: "POST",
        headers: [["header-key", "header-value"]],
        endpoint: `${process.env.BASE_URL}/api/scan/copyleaks/export/${exportId}/${scanId}/pdf-report`,
      },
      customField: {
        theme: "dark",
        fontSize: 12,
      },
      maxRetries: 3,
      crawledVersion: {
        verb: "POST",
        headers: [["header-key", "header-value"]],
        endpoint: `${process.env.BASE_URL}/api/scan/copyleaks/export/${userId}/${scanId}/${exportId}/crawled-version`,
      },
      completionWebhook: `${process.env.BASE_URL}/api/scan/copyleaks/export/${exportId}/completed`,
    },
  };

  try {
    const { data } = await axios.request(options);
    // yaha dalna hia
    const [
      [
        {
          userId,
          email,
          accountType,
          bio,
          lastname,
          city,
          expertise,
          interest,
        },
      ],
    ] = curr_user;
 
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--remote-debugging-port=9222",
      ],
    }); // Launch browser
    const page = await browser.newPage();

    await page.goto("https://dashboard.skylineacademic.com");
    // Inject code to set localStorage
    await page.evaluate(
      (Id, em) => {
        localStorage.setItem(
          "userInfo",
          JSON.stringify({
            userId: Id,
            email: em,
            name: "test",
            accountType: "user",
            profileImg: null,
            bio: "i am tester",
            lastname: "yo",
            city: "testpur",
            expertise: "testing",
            interest: "testing",
          })
        );
      },
      userId,
      email
    );

  // const WHITELISTED_TOKEN = "dkfgj45kdsfnEWTRgnr456einfERTdi456ERTu34534jYn345jnbk546546"
    
  //   const verifyResponse = await fetch(`${process.env.BASE_URL}/api/verifyRecaptcha`, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ WHITELISTED_TOKEN }),
  //   });
  //   // const verifyData = await verifyResponse.json();
  //   console.log(verifyResponse,'chehck this resopnse  ')

    const localStorageData = await page.evaluate(() => {
      return localStorage.getItem("userInfo");
    });

    await page.goto(
      `https://dashboard.skylineacademic.com/user/scanreport/${scanId}`
    );
    await page.waitForSelector("#cr-hint-results-score");

    const sonedata = await page.evaluate(() => {
      const percentageElements = document.querySelectorAll(".ng-tns-c139-3");
      const percentage =
        percentageElements.length >= 4
          ? Array.from(percentageElements)
              .slice(-4)
              .map((element) => element.innerText)
          : ["Not percentage data found"];

      const content =
        Array.from(document.querySelectorAll(".ng-tns-c155-1"))
          .map((el) => el.innerText) || "No content found";

      const buttonText =
        document.querySelector("button.mat-stroked-button")?.innerText ||
        "No button text found";

      let ai = parseInt(percentage[0]);
      // let text = content
      return { ai, content };
    });

    await mysqlPool.query(
      `UPDATE scanScore
      SET probabilityAIContent = ?
      WHERE scanId =? `,
      [sonedata.ai, scanId]
    );

    // get source.json and extract value form it then pass value into hte aiContentDetection
    const filePath = path.join(
      "/home/root/public_html/backend",
      // __dirname,
      // '..',
      // '..',
      "scanDoc",
      userId.toString(),
      scanId.toString(),
      "source.json"
    );
  
    const fileContent = fs.readFileSync(filePath, "utf-8");
    
    // Parse the JSON data
    const sourceData = JSON.parse(fileContent);
        
      aiContentDetection(sourceData.text.value, scanId,sourceData.metadata.words);
   
    await browser.close();
    console.log(data, "this is success===>");
  } catch (error) {
    console.error(error, "this .is error");
  }
};

// webhook export result completion
const resultCompletionWebhook = async (req, res) => {
  try {
    console.log("export completed webhook called");
    const { export_id, status } = req.params;
    const body = req.body;
    res.send(
      `Webhook called for export_id: ${export_id} and status: ${status}`
    );
  } catch (error) {
    console.log(error, "error");
    res.json({
      error,
    });
  }
};

// webhook export result(it will show data)
const resultWebhook = async (req, res) => {
  try {
    const { export_id, result_id, userId, scanId } = req.params;

    // create a json file (complete.json)
    // Define the path and filename for the JSON file
    const filePath = path.join(
      "/home/root/public_html/backend",
      // __dirname,
      // '..',
      // '..',
      "scanDoc",
      userId.toString(),
      scanId.toString(),
      "Result",
      `${result_id}.json`
    );
    const detailedData = req.body;
    // Ensure the directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Write the data to the JSON file
    fs.writeFileSync(filePath, JSON.stringify(detailedData, null, 2), "utf-8");

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
    console.log(error, "error");
    res.json({
      error,
    });
  }
};

const pdfResultWebhook = async (req, res) => {
  const { export_id, scanId } = req.params;
  const headers = req.headers;
  await mysqlPool.query(
    `UPDATE identicalResults SET pdfReportPath=? WHERE exportId=?`,
    [`/home/root/public_html/backend/uploads/${export_id}.pdf`, export_id]
  );
  // Log request headers
  try {
    if (headers["content-type"] !== "application/pdf") {
      return res
        .status(400)
        .send("Invalid content type. Expected application/pdf");
    }

    // Define the path to save the PDF
    const pdfFilePath = path.join(
      "/home/root/public_html/backend",
      "uploads",
      `${scanId + "Report"}.pdf`
    );
    // Create a write stream to save the PDF
    const writeStream = fs.createWriteStream(pdfFilePath);

    // Pipe the request stream to the write stream
    req.pipe(writeStream);

    // Handle stream events
    writeStream.on("finish", () => {
      res.send(`Webhook called for export_id ${export_id}, file received`);
      removeScanReportLogo(pdfFilePath);
    });

    writeStream.on("error", (err) => {
      console.error("Error writing file:", err);
      res.status(500).send("Error saving file");
    });
  } catch (error) {
    console.error(error, "error");
  }
};

// crawled version
const crawledVersionResult = async (req, res) => {
  const { userId, scanId } = req.params;
  const body1 = req.body;

  // create a json file (source.json)
  // Define the path and filename for the JSON file
  const filePath = path.join(
    "/home/root/public_html/backend",
    // __dirname,
    // '..',
    // '..',
    "scanDoc",
    userId.toString(),
    scanId.toString(),
    "source.json"
  );

  // Ensure the directory exists
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  // Write the data to the JSON file
  fs.writeFileSync(filePath, JSON.stringify(body1, null, 2), "utf-8");
  res.send(`Webhook crawled version called for export_id`);
};
// test
async function storeResult(req, res) {
  const export_id = "export5432123";
  const result_id = "ecc3e4c8b22";
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
    res.status(200).json({
      message: "file uploaded successfully",
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
      from: "support@skylineacademic.com",
      to: email,
      subject: "Scan Report Request",
      html: newMailTemplate(link),
      bcc: "support@skylineacademic.com",
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
  let message = "";
  if (link.length > 1 && Array.isArray(link)) {
    for (let i = 0; i < link.length; i++) {
      message += link[i] + "<br>";
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
    var filePath = `uploads/${req.body.filePath}Report.pdf`;
    const fileName = path.basename(filePath);

    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error("File does not exist", err);
        return res.status(404).end();
      }

      // Stream the file to the client
      const fileStream = fs.createReadStream(filePath);
      res.setHeader("Content-disposition", "attachment; filename=" + fileName);
      res.setHeader("Content-type", "application/pdf");

      fileStream.pipe(res);
    });
  } catch (error) {
    console.log(error, "error");
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
      "/home/root/public_html/backend",
      // __dirname,
      // '..',
      // '..',
      "scanDoc",
      userId,
      scanId,
      "source.json"
    );

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Read and send the JSON file
    const jsonData = fs.readFileSync(filePath, "utf-8");
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
      "/home/root/public_html/backend",
      // __dirname,
      // '..',
      // '..',
      "scanDoc",
      userId,
      scanId,
      "complete.json"
    );

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Read and send the JSON file
    const jsonData = fs.readFileSync(filePath, "utf-8");
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
      "/home/root/public_html/backend",
      // __dirname,
      // '..',
      // '..',
      "scanDoc",
      userId,
      scanId,
      "Result",
      `${id}`
    );
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    // Read and send the JSON file
    const jsonData = fs.readFileSync(filePath, "utf-8");
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
    method: "PATCH",
    url: "https://api.copyleaks.com/v3.1/scans/delete",
    headers: {
      Authorization: `Bearer ${accessToken.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
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
  scanIds.forEach((scanId) => {
    const directoryPath = path.join(
      "/home/root/public_html/backend",
      "scanDoc",
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
    // delete from copyleaks
    await deleteFromCopyLeaks(scanIds);

    // delete from scan store
    const placeholders = scanIds.map(() => "?").join(",");
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
      message: "Files deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({
      message: "Error deleting",
    });
  }
};
const generatePdfFromHtml = async (text, data, htmlTemplatePath, scanId,totalwords) => {
  const aiPercentage = await mysqlPool.query(
    `SELECT * FROM scanScore WHERE scanId = ?`,
    [scanId]
  );
  const starts = data?.explain?.patterns?.text?.chars?.starts ?? 0;
  const lengths = data?.explain?.patterns?.text?.chars?.lengths ?? 0;
  let totalWords = totalwords || 0;
  // let creationTime = data.scannedDocument.creationTime || 0;
  let aipercentage = aiPercentage[0][0].probabilityAIContent;

  let aiwords = Math.floor((totalWords * aiPercentage) / 100) || 0;

  // Highlight text
  const highlightedText = highlightText(text, starts, lengths, aipercentage);
  try {
    const templatePath = path.join(__dirname, htmlTemplatePath);
    const encryptedPdfPath = path.join(
      "/home/root/public_html/backend",
      "uploads",
      `${scanId + "report"}.pdf`
    );

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found at ${templatePath}`);
    }

    let html = fs.readFileSync(templatePath, "utf-8");
    html = html.replace("{{data}}", JSON.stringify(data));
    html = html.replace("{{mytext}}", highlightedText);
    html = html.replace("{{aipercent}}", aipercentage);
    html = html.replace("{{aiper}}", aipercentage);
    html = html.replace("{{aiword}}", aiwords);
    html = html.replace("{{humanword}}", totalWords - aiwords);
    html = html.replace("{{humanper}}", 100 - aipercentage);
    html = html.replace("{{totalwords}}", totalWords);
    html = html.replace("{{filename}}", scanId);
    html = html.replace("{{textval}}", highlightedText);

    const options = { format: "A4" };
    const file = { content: html };
    const pdfBuffer = await pdf.generatePdf(file, options);
    fs.writeFileSync(encryptedPdfPath, pdfBuffer);
    console.log("ai pdf generation done ");
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};

const highlightText = (text, starts, lengths, ai) => {
  let highlighted = "";
  let currentIndex = 0;
  text = text.replace(/\n/g, '<br>');
  text = text.replace(/<br><br><br>/g, '<br>');
  if (ai == 0) {
    highlighted = `<mark class='black'>${text}</mark>`;
    return highlighted;
  } else if (ai == 100) {
    highlighted = `<mark class='purple'>${text}</mark>`;
    return highlighted;
  }

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const length = lengths[i];
    const end = start + length;
    highlighted += `<mark class='purple'>${text.slice(
      currentIndex,
      start
    )}</mark>`;
    highlighted += `<mark class='yellow'>${text.slice(start, end)}</mark>`;
    currentIndex = end;
  }
  // Add the remaining text
  highlighted += text.slice(currentIndex);
  return highlighted;
};

const getSingleScan = async (req, res) => {
  try {
    console.log("--", req.query)
    const scanId = req.body.scanId;

    // Execute the SQL query
    const [rows] = await mysqlPool.query(
      `SELECT * FROM scans WHERE scanId = ?`,
      [scanId]
    );

    // Check if the scan exists
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Scan not found' });
    }

    // Send the result as a response
    res.json(rows[0]);
  } catch (error) {
    // Handle errors
    console.error('Error fetching scan:', error);
    res.status(500).json({ message: 'An error occurred while fetching the scan' });
  }
};

const downloadPdfReportForAI = async (req, res) => {
  try {
    // var filePath = `uploads/${req.body.filePath}report.pdf`;
    const filePath = `/home/root/public_html/backend/uploads/${req.body.filePath}report.pdf`;
    const fileName = path.basename(filePath);

    // Check if the file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.error("File does not exist", err);
        return res.status(404).end();
      }

      // Stream the file to the client
      const fileStream = fs.createReadStream(filePath);
      res.setHeader("Content-disposition", "attachment; filename=" + fileName);
      res.setHeader("Content-type", "application/pdf");

      fileStream.pipe(res);
    });
  } catch (error) {
    console.log(error, "error");
    res.json({
      error,
    });
  }
};

const downloadPdfReportForBothFile = async (req, res) => {
  try {
    const filePath1 = `/home/root/public_html/backend/uploads/${req.body.filePath}Report.pdf`;
    const filePath2 = `/home/root/public_html/backend/uploads/${req.body.filePath}report.pdf`;

    // Check if both files exist
    if (!fs.existsSync(filePath1) || !fs.existsSync(filePath2)) {
      return res.status(404).json({ message: "One or more files not found" });
    }

    // Set response headers for zip file
    const zipFileName = `${req.body.filePath}_files.zip`;
    res.setHeader("Content-Disposition", `attachment; filename=${zipFileName}`);
    res.setHeader("Content-Type", "application/zip");

    // Create a zip archive
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    // Add both files to the archive
    archive.file(filePath1, { name: `${req.body.filePath}Report.pdf` });
    archive.file(filePath2, { name: `${req.body.filePath}report.pdf` });

    // Finalize the archive
    archive.finalize();
  } catch (error) {
    console.error("Error while zipping files:", error);
    res.status(500).json({ error: "Failed to generate zip file" });
  }
};
//download single or muliple reports from myscan dashboard(reportsDownloading)
const reportsDownloading = async (req, res) => {
  try {
    const filePaths = Array.isArray(req.body) ? req.body : [req.body];

    if (filePaths.length === 1) {
      const filePath = `/home/root/public_html/backend/uploads/${filePaths[0]}Report.pdf`;
      const fileName = path.basename(filePath);

      fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
          console.error("File does not exist", err);
          return res.status(404).json({ error: "File not found" });
        }

        const fileStream = fs.createReadStream(filePath);
        res.setHeader(
          "Content-disposition",
          "attachment; filename=" + fileName
        );
        res.setHeader("Content-type", "application/pdf");

        fileStream.pipe(res);
      });
    } else {
      const zipFileName = "reports.zip";
      const output = fs.createWriteStream(zipFileName);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.on("error", (err) => {
        console.error("Error creating zip", err);
        return res.status(500).json({ error: "Error creating zip file" });
      });

      archive.pipe(output);

      for (const filePath of filePaths) {
        const fullPath = `/home/root/public_html/backend/uploads/${filePath}Report.pdf`;

        if (fs.existsSync(fullPath)) {
          archive.file(fullPath, { name: path.basename(fullPath) });
        } else {
          console.error(`File not found: ${fullPath}`);
        }
      }

      archive.finalize();

      output.on("close", () => {
        res.setHeader(
          "Content-disposition",
          "attachment; filename=" + zipFileName
        );
        res.setHeader("Content-type", "application/zip");
        fs.createReadStream(zipFileName)
          .pipe(res)
          .on("finish", () => {
            fs.unlinkSync(zipFileName);
          });
      });
    }
  } catch (error) {
    console.error(error, "Error processing request");
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  aiContentDetection,
  crawledVersionResult,
  downloadPdfReport,
  exportResult,
  finalIdenticalCharsData,
  getCompleteFile,
  getResultsFile,
  getSourceFile,
  loginCopyLeaks,
  mailTransfer,
  pdfResultWebhook,
  plagiarismDetect,
  plagiarismDetectionForImages,
  removeScanResult,
  resultCompletionWebhook,
  resultWebhook,
  showScanResults,
  reportsDownloading,
  showScanScore,
  storeResult,
  uploadingStatus,
  verifyToken,
  webhookScanStatus,
  downloadPdfReportForAI,
  downloadPdfReportForBothFile,
  getSingleScan
};
