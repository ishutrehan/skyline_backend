const pdfParse = require("pdf-parse");
const fs = require("fs").promises;
const fsp = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const officeParser = require("officeparser");
const WordExtractor = require("word-extractor");
const Tesseract = require("tesseract.js");
const xlsx = require("xlsx");
const natural = require("natural");

const {
  aiContentDetection,
  plagiarismDetect,
  plagiarismDetectionForImages,
} = require("./copyLeaks.controller");
const mysqlPool = require("../db/db");
const { default: axios } = require("axios");
const { encode } = require("punycode");

const generateUniqueScanId = (fileName) => {
  fileName = fileName.toLowerCase();
  fileName = fileName.substring(0, 10);
  return `${fileName}-${Date.now().toString()}-ai`;
};
const generateUniqueScanId2 = (fileName) => {
  fileName = fileName.toLowerCase();
  fileName = fileName.substring(0, 10);
  return `${fileName}-${Date.now().toString()}-plagiarism`;
};
const generateUniqueScanId3 = (fileName) => {
  fileName = fileName.toLowerCase();
  fileName = fileName.substring(0, 10);
  return `${fileName}-${Date.now().toString()}-both`;
};

// read file AS base64
async function readFileAsBase64(filePath) {
  try {
    const data = await fs.readFile(filePath);
    return data.toString("base64");
  } catch (err) {
    console.log(err, "----->fileerror");
    throw err;
  }
}
async function extractTextFromFile(filePath) {
  console.log("Running function to extract text...", filePath);

  try {
    const ext = path.extname(filePath).toLowerCase();
    console.log(`File extension: ${ext}`);

    if (ext === ".pdf") {
      const pdfBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(pdfBuffer);
      const count = pdfData.text.split(" ");
      return pdfData.text;
    } else if (ext === ".docx" || ext === ".doc") {
      const docxBuffer = await fs.readFile(filePath);
      const docxData = await mammoth.extractRawText({ buffer: docxBuffer });
      return docxData.value;
    } else if (ext === ".xlsx") {
      const xlsxBuffer = await fs.readFile(filePath);
      const workbook = xlsx.read(xlsxBuffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]]; // Get the first sheet
      const jsonData = xlsx.utils.sheet_to_json(sheet);
      return JSON.stringify(jsonData);
    } else if (ext === ".txt") {
      const textData = await fs.readFile(filePath, "utf8");
      return textData;
    } else if ([".jpg", ".jpeg", ".png", ".gif"].includes(ext)) {
      const text = await new Promise((resolve, reject) => {
        Tesseract.recognize(filePath, "eng", {
          logger: (info) => console.log(info), // Logs progress
        })
          .then(({ data: { text } }) => {
            resolve(text);
          })
          .catch((error) => {
            console.error("Error processing image:", error);
            reject(error);
          });
      });
      console.log(text.length, "====ai text count check its words====");
      return text;
    } else {
      const errorMessage = "Unsupported file type: " + ext;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("Error processing file:", error);
    throw error;
  }
}
// read string as base64 encoded
function readStringBase64(data) {
  const base64String = Buffer.from(data).toString("base64");
  return base64String;
}
const uploadDocAndTextInDb = async (req, res) => {
  const allowedMimeTypeForImage = ["image/png", "image/jpeg", "image/jpg"];
  console.log("i am on line guys");
  try {
    var docDetails = {
      noOfChars: 0,
      noOfPages: 0,
    };

    //  add userId while req from client
    const { ContentDetection, plagiarismDetection, selectedLanguage, userId } =
      req.body;
    let generatedScanId = "";
    // if (plagiarismDetection == 'false' && ContentDetection == 'true') {
    //   generatedScanId = await generateUniqueScanId();
    // }
    // if (plagiarismDetection == 'true' && ContentDetection == 'false') {
    //   generatedScanId = await generateUniqueScanId2();
    // }
    // if (plagiarismDetection == 'true' && ContentDetection == 'true') {
    //   generatedScanId = await generateUniqueScanId3();
    // }

    if (!req.file) {
      if (plagiarismDetection == "false" && ContentDetection == "true") {
        generatedScanId = await generateUniqueScanId("text");
      }
      if (plagiarismDetection == "true" && ContentDetection == "false") {
        generatedScanId = await generateUniqueScanId2("text");
      }
      if (plagiarismDetection == "true" && ContentDetection == "true") {
        generatedScanId = await generateUniqueScanId3("text");
      }
      let textData = req.body.text;
      await mysqlPool.query(
        `INSERT INTO scans (scanId,userId,documentName,documentType) VALUES (?,?,?,?)`,
        [generatedScanId, userId, "textData.text", "text"]
      );
      const message = "file scanned successfully";
      await mysqlPool.query(
        "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
        [message, userId, 0]
      );
      const encodeBase64 = await readStringBase64(textData);
      if (plagiarismDetection == "true" && ContentDetection == "false") {
        await plagiarismDetect(
          encodeBase64,
          generatedScanId,
          generatedScanId.toString() + ".txt",
          userId,
          false,
          true
        );
      } else if (plagiarismDetection == "false" && ContentDetection == "true") {
        // await aiContentDetection(textData, generatedScanId);
        await plagiarismDetect(
          encodeBase64,
          generatedScanId,
          generatedScanId.toString() + ".txt",
          userId,
          true,
          false
        );
      } else if (plagiarismDetection == "true" && ContentDetection == "true") {
        // await aiContentDetection(textData, generatedScanId);
        await plagiarismDetect(
          encodeBase64,
          generatedScanId,
          generatedScanId.toString() + ".txt",
          userId,
          true,
          true
        );
      }

      return res.json({
        docDetails,
      });
    }

    const filePath = req.file.path;
    const  fileName = req.file.filename;
    const file12 = req.file.mimetype;
    const fileTypeDetails = file12.split("/");
    const fileType = fileTypeDetails[fileTypeDetails.length - 1];
    const encodeBase64 = await readFileAsBase64(filePath);
    const decodeBasetext = await extractTextFromFile(filePath);

    if (plagiarismDetection == "false" && ContentDetection == "true") {
      generatedScanId = await generateUniqueScanId(fileName);
    }
    if (plagiarismDetection == "true" && ContentDetection == "false") {
      generatedScanId = await generateUniqueScanId2(fileName);
    }
    if (plagiarismDetection == "true" && ContentDetection == "true") {
      generatedScanId = await generateUniqueScanId3(fileName);
    }
    await mysqlPool.query(
      `INSERT INTO scans (scanId,userId,documentName,documentType) VALUES (?,?,?,?)`,
      [generatedScanId, userId, fileName, fileType]
    );

    const message = "file scanned successfully";
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, userId, 0]
    );
    if (allowedMimeTypeForImage.includes(file12)) {
      if (plagiarismDetection == "true" && ContentDetection == "false") {
        await plagiarismDetectionForImages(
          encodeBase64,
          generatedScanId,
          fileName,
          userId,
          false,
          selectedLanguage,
          true
        );
      } else if (plagiarismDetection == "false" && ContentDetection == "true") {
        // await aiContentDetection(decodeBasetext, generatedScanId);
        await plagiarismDetectionForImages(
          encodeBase64,
          generatedScanId,
          fileName,
          userId,
          true,
          selectedLanguage,
          false
        );
      } else if (plagiarismDetection == "true" && ContentDetection == "true") {
        // await aiContentDetection(decodeBasetext, generatedScanId);
        await plagiarismDetectionForImages(
          encodeBase64,
          generatedScanId,
          fileName,
          userId,
          true,
          selectedLanguage,
          true
        );
      }
    } else {
      if (plagiarismDetection == "true" && ContentDetection == "false") {
        await plagiarismDetect(
          encodeBase64,
          generatedScanId,
          fileName,
          userId,
          false,
          true
        );
      } else if (plagiarismDetection == "false" && ContentDetection == "true") {
        // await aiContentDetection(decodeBasetext, generatedScanId);
        await plagiarismDetect(
          encodeBase64,
          generatedScanId,
          fileName,
          userId,
          true,
          false
        );
      } else if (plagiarismDetection == "true" && ContentDetection == "true") {
        // await aiContentDetection(decodeBasetext, generatedScanId);
        await plagiarismDetect(
          encodeBase64,
          generatedScanId,
          fileName,
          userId,
          true,
          true
        );
      }
    }
    return res.status(200).json({
      docDetails,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "something went wrong",
    });
  }
};
// const uploadDocAndTextInDb = async (req, res) => {
//   const allowedMimeTypeForImage = ['image/png' , 'image/jpeg' ,'image/jpg']

//   try {
//     var docDetails = {
//       noOfChars: 0,
//       noOfPages: 0,
//     };

//     //  add userId while req from client
//     const { ContentDetection, plagiarismDetection ,selectedLanguage,userId} = req.body;
//     const generatedScanId = await generateUniqueScanId();
//     if (!req.file) {
//       let textData = req.body.text;
//       const res12 = await mysqlPool.query(
//         `INSERT INTO scans (scanId,userId,documentName,documentType) VALUES (?,?,?,?)`,
//         [generatedScanId, userId, 'textData.text', 'text']
//       );
//       const message = 'file scanned successfully'
//       await mysqlPool.query(
//         'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
//         [message, userId, 0]
//       );
//       const encodeBase64 = await readStringBase64(req.body.text);

//       // if(plagiarismDetection && !ContentDetection){
//       //   await plagiarismDetect(
//       //     encodeBase64,
//       //     generatedScanId,
//       //     generatedScanId.toString() + '.txt',
//       //     userId,
//       //     false
//       //   );
//       // }

//       // else if (ContentDetection && plagiarismDetection){
//       //   await plagiarismDetect(
//       //     encodeBase64,
//       //     generatedScanId,
//       //     generatedScanId.toString() + '.txt',
//       //     userId,
//       //     ContentDetection
//       //   );
//       // }
//       await plagiarismDetect(
//             encodeBase64,
//             generatedScanId,
//             generatedScanId.toString() + '.txt',
//             userId,
//             ContentDetection
//           );

//       return res.json({
//         docDetails,
//       });
//     }

//     const filePath = req.file.path;
//     var fileName = req.file.filename;
//     const file12 = req.file.mimetype;
//     const fileTypeDetails = file12.split('/');
//     const fileType = fileTypeDetails[fileTypeDetails.length - 1];

//     const res12 = await mysqlPool.query(
//       `INSERT INTO scans (scanId,userId,documentName,documentType) VALUES (?,?,?,?)`,
//       [generatedScanId, userId, fileName, fileType]
//     );
//     const message = 'file scanned successfully'
//     await mysqlPool.query(
//       'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
//       [message, userId, 0]
//     );
//     const encodeBase64 = await readFileAsBase64(filePath);
//     if(allowedMimeTypeForImage.includes(file12)){
//     //   if(plagiarismDetection && !ContentDetection){

//     //     const resData = await plagiarismDetectionForImages(
//     //     encodeBase64,
//     //     generatedScanId,
//     //     fileName,
//     //     userId,
//     //     false,
//     //     selectedLanguage
//     //     )
//     //   }
//     //   else if(plagiarismDetection && ContentDetection){

//     //     const resData = await plagiarismDetectionForImages(
//     //     encodeBase64,
//     //     generatedScanId,
//     //     fileName,
//     //     userId,
//     //     true,
//     //     selectedLanguage
//     //     )
//     //   }
//     // }else{

//     //   if(plagiarismDetection && !ContentDetection){
//     //     await plagiarismDetect(
//     //       encodeBase64,
//     //       generatedScanId,
//     //       generatedScanId.toString() + '.txt',
//     //       userId,
//     //       false
//     //     );
//     //   }
//     //    else if (ContentDetection && plagiarismDetection){
//     //     await plagiarismDetect(
//     //       encodeBase64,
//     //       generatedScanId,
//     //       generatedScanId.toString() + '.txt',
//     //       userId,
//     //       ContentDetection
//     //     );
//     //   }

//         const resData = await plagiarismDetectionForImages(
//         encodeBase64,
//         generatedScanId,
//         fileName,
//         userId,
//         ContentDetection,
//         selectedLanguage
//         )
//     }else{
//       const res4 = await plagiarismDetect(
//         encodeBase64,
//         generatedScanId,
//         fileName,
//         userId,
//         ContentDetection
//       );
//     }
//     return res.status(200).json({
//       docDetails,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: error.message || 'something went wrong',
//     });
//   }
// };

// show all the scan data with userId
const showScannedData = async (req, res) => {
  try {
    const userId = req.query.userId;
    const search = req.query.search;
    const pageNo = req.query.pageNo || 1;
    const limit = 6;
    const offset = (pageNo - 1) * limit;
    const [resultValue] = await mysqlPool.query(
      "SELECT s.*, ss.* FROM scans s LEFT JOIN scanScore ss ON s.scanId = ss.scanId WHERE s.userId = ? ORDER BY s.created_at DESC",
      [userId]
    );

    // pagination,search functionality,and total number of pages to retrieve
    let query =
      "SELECT s.*, ss.* FROM scans s LEFT JOIN scanScore ss ON s.scanId = ss.scanId WHERE s.userId = ?";
    const params = [userId];

    if (search) {
      query += " AND s.DocumentName like ?";
      params.push(`%${search}%`);
    }
    query += " ORDER BY s.created_at DESC";
    query += " LIMIT ?,? ";
    params.push(offset, limit);
    const [result] = await mysqlPool.query(query, params);
    const totalPages = Math.ceil(resultValue.length / limit);
    res.status(200).json({
      result,
      totalPages,
    });
  } catch (error) {
    res.json({
      message: error.message,
    });
  }
};

// show scan data details page
const showReportOfScannedData = async (req, res) => {
  try {
    const scanId = req.params.id;
    const [result] = await mysqlPool.query(
      "SELECT * FROM scans WHERE scanId =?",
      [scanId]
    );
    res.json({
      result,
    });
  } catch (error) {
    console.log(error);
    res.status(404).json({
      message: error.message,
    });
  }
};

// count data from text file
async function countWordsInTextFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    const wordCount = countWordsInText(data); // Assuming countWordsInText is defined
    return wordCount;
  } catch (err) {
    console.log(err, "----->fileerror");
    throw err;
  }
}

function countWordsInText(text) {
  // Count words using a regex or other suitable method
  const words = text.split(/\b\S+\b/g);
  return words.length;
}
// This endpoint will receive submitted text and file to be checked for words count
const wordCountsFromStringAndDoc = async (req, res) => {
  const allowedMimeTypeForImage = ["image/png", "image/jpeg", "image/jpg"];
  const selectedLanguageForImage = req.body.selectedLanguage;
  try {
    var docDetails = {
      noOfChars: 0,
      noOfPages: 0,
    };
    if (!req.file) {
      let text = req.body.text;

      return res.json({
        docDetails: {
          noOfChars: text.trim().split(/\s+/).length,
          noOfPages: 1,
        },
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    var wordCount;
    if (req.file.mimetype === "application/msword") {
      //ms word file
      const extractor = new WordExtractor();
      const extracted = extractor.extract(filePath);
      await extracted.then(function (doc) {
        wordCount = doc.getBody().length;
      });
    } else if (req.file.mimetype === "text/plain") {
      //text file
      await countWordsInTextFile(filePath).then((data) => {
        wordCount = data;
        console.log(`Total word count in text file: ${wordCount}`);
      });
    } else if (req.file.mimetype === "application/pdf") {
      const fileStream = fsp.createReadStream(filePath);
      
      // Tika server endpoint
      const TIKA_ENDPOINT = 'http://localhost:9998/tika';
      
          try {
              const response = await axios.put(TIKA_ENDPOINT, fileStream, {
                  headers: {
                      'Content-Type': 'application/pdf',
                      'Accept': 'text/plain'
                  },
              });
              const text = response.data;
               wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      
              console.log(`Extracted Text: ${text}`);
              console.log(`Word Count: ${wordCount}`);
          } catch (error) {
              console.error('Error extracting text:', error.message);
          }

    } else if (allowedMimeTypeForImage.includes(req.file.mimetype)) {
      //images
      await Tesseract.recognize(filePath, selectedLanguageForImage).then(
        ({ data: { text } }) => {
          const words = text.split(/\s+/).filter((word) => word.length > 0);
          wordCount = words.length;
        }
      );
    } else {
      const data = await officeParser.parseOfficeAsync(filePath); //
      let textData = data.toString();
      textData = textData
        .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between lowercase-uppercase transitions
        .replace(/(\d)([a-zA-Z])/g, "$1 $2") // Add space between digits and letters
        .replace(/([a-zA-Z])(\d)/g, "$1 $2") // Add space between letters and digits
        .replace(/\s+/g, " ") // Replace multiple spaces with a single space
        .trim(); // Trim leading and trailing spaces

      console.log(textData, "Normalized text");

      // Tokenize and count words
      const tokenizer = new natural.WordTokenizer();
      const tokens = tokenizer.tokenize(textData);
      wordCount = tokens.length;
      console.log(wordCount, "checktjthe wordcount");
    }
    docDetails = {
      noOfChars: wordCount,
      fileName,
    };
    res.status(200).json({
      docDetails,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message || "something went wrong",
    });
  }
};

// const wordCountsFromStringAndDoc = async (req, res) => {
//   const allowedMimeTypeForImage = ['image/png', 'image/jpeg', 'image/jpg'];
//   const selectedLanguageForImage = req.body.selectedLanguage;

//   try {
//     if (!req.file) {
//       let text = req.body.text;
//       return res.json({
//         docDetails: {
//           noOfChars: text.trim().split(/\s+/).length,
//           noOfPages: 1,
//         },
//       });
//     }

//     const filePath = req.file.path;
//     const fileName = req.file.originalname;
//     let wordCount = 0;

//     if (req.file.mimetype === 'application/pdf') {
//       // Extract text using pdf-parse
//       const pdfBuffer = fs.readFileSync(filePath);
//       const data = await pdfParse(pdfBuffer);

//       if (data.text.trim()) {
//         // Count words in extracted text
//         wordCount = data.text.trim().split(/\s+/).filter(word => word.length > 0).length;
//       } else {
//         // Fallback to OCR if text extraction fails
//         const pdfConverter = new pdf2pic({ density: 300, format: 'png', saveFilename: 'page' });
//         const imagePaths = await pdfConverter.convertBulk(filePath, -1);

//         for (const imagePath of imagePaths) {
//           const { data: { text } } = await Tesseract.recognize(imagePath, selectedLanguageForImage);
//           wordCount += text.trim().split(/\s+/).filter(word => word.length > 0).length;
//         }
//       }
//     } else if (allowedMimeTypeForImage.includes(req.file.mimetype)) {
//       const { data: { text } } = await Tesseract.recognize(filePath, selectedLanguageForImage);
//       wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;
//     } else {
//       const data = await officeParser.parseOfficeAsync(filePath);
//       let textData = data.toString();
//       textData = textData
//         .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between lowercase-uppercase transitions
//         .replace(/(\d)([a-zA-Z])/g, '$1 $2') // Add space between digits and letters
//         .replace(/([a-zA-Z])(\d)/g, '$1 $2') // Add space between letters and digits
//         .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
//         .trim(); // Trim leading and trailing spaces

//       console.log(textData, 'Normalized text');

//       // Tokenize and count words
//       const tokenizer = new natural.WordTokenizer();
//       const tokens = tokenizer.tokenize(textData);
//       wordCount = tokens.length;
//       console.log(wordCount,'checktjthe wordcount')

//     }

//     res.status(200).json({
//       docDetails: {
//         noOfChars: wordCount,
//         fileName,
//       },
//     });
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({
//       message: error.message || 'Something went wrong',
//     });
//   }
// };

//uploadDocAndStringForScanned proofreading
const uploadDocAndStringForProofReadingEditing = async (req, res) => {
  try {
    if (!req.file) {
      const {
        userId,
        documentType,
        documentSubject,
        selectLanguage,
        notes,
        selectServices,
        deliveryDate,
        content,
        cost,
      } = req.body;
      const [response] = await mysqlPool.query(
        `INSERT INTO proofReadingEditing (userId,documentType,documentSubject,selectLanguage,notes,selectServices,content,deliveryDate,cost) VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          userId,
          documentType,
          documentSubject,
          selectLanguage,
          notes,
          selectServices,
          content,
          deliveryDate,
          +cost,
        ]
      );
      const message = "file uploaded successfully";
      await mysqlPool.query(
        "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
        [message, userId, 0]
      );
      return res.json({
        response,
      });
    }
    const {
      userId,
      documentType,
      documentSubject,
      selectLanguage,
      notes,
      selectServices,
      deliveryDate,
      cost,
    } = req.body;
    const filePath = req.file.path;
    const fileName = req.file.filename;
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
    const message = "file scanned successfully";
    await mysqlPool.query(
      "INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)",
      [message, userId, 0]
    );
    return res.json({
      response,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message || "something went wrong",
    });
  }
};
const uploadImageFile = async(req,res)=>{
  try {
    const {fileData} = req.file;
    const filePath = req.file.path;
    const fileName = req.file.originalname;
    res.json({
      fileData:req.file
    })
  } catch (error) {
    console.log(error)
    res.json({
      error
    })
  }
}

module.exports = {
  uploadDocAndTextInDb,
  showScannedData,
  showReportOfScannedData,
  wordCountsFromStringAndDoc,
  uploadDocAndStringForProofReadingEditing,
  uploadImageFile
};
