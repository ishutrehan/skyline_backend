const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const officeParser = require('officeparser');
const WordExtractor = require('word-extractor');
const Tesseract = require('tesseract.js');

const {
  aiContentDetection,
  ProofReading,
  plagiarismDetect,
  plagiarismDetectionForImages,
} = require('./copyLeaks.controller');
const mysqlPool = require('../db/db');
const { default: axios } = require('axios');
const { encode } = require('punycode');

const generateUniqueScanId = () => {
  return `user-${Date.now().toString()}`;
};

// read file AS base64
function readFileAsBase64(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.toString('base64'));
      }
    });
  });
}

// read string as base64 encoded
function readStringBase64(data) {
  const base64String = Buffer.from(data).toString('base64');
  return base64String;
}

const uploadDocAndTextInDb = async (req, res) => {
  const allowedMimeTypeForImage = ['image/png' , 'image/jpeg' ,'image/jpg']

  try {
    var docDetails = {
      noOfChars: 0,
      noOfPages: 0,
    };

    //  add userId while req from client
    const { ContentDetection, plagiarismDetection ,selectedLanguage,userId} = req.body;
    const generatedScanId = await generateUniqueScanId();
    if (!req.file) {
      let textData = req.body.text;
      const res12 = await mysqlPool.query(
        `INSERT INTO scans (scanId,userId,documentName,documentType) VALUES (?,?,?,?)`,
        [generatedScanId, userId, 'textData.text', 'text']
      );
      const message = 'file scanned successfully'
      await mysqlPool.query(
        'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
        [message, userId, 0]
      );
      const encodeBase64 = await readStringBase64(req.body.text);
      const res3 = await plagiarismDetect(
        encodeBase64,
        generatedScanId,
        generatedScanId.toString() + '.txt',
        userId,
        ContentDetection
      );

      return res.json({
        docDetails,
      });
    }

    const filePath = req.file.path;
    var fileName = req.file.filename;
    const file12 = req.file.mimetype;
    const fileTypeDetails = file12.split('/');
    const fileType = fileTypeDetails[fileTypeDetails.length - 1];

    const res12 = await mysqlPool.query(
      `INSERT INTO scans (scanId,userId,documentName,documentType) VALUES (?,?,?,?)`,
      [generatedScanId, userId, fileName, fileType]
    );
    const message = 'file scanned successfully'
    await mysqlPool.query(
      'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
      [message, userId, 0]
    );
    const encodeBase64 = await readFileAsBase64(filePath);
    if(allowedMimeTypeForImage.includes(file12)){
        const resData = await plagiarismDetectionForImages(
        encodeBase64,
        generatedScanId,
        fileName,
        userId,
        ContentDetection,
        selectedLanguage
        )
    }else{
      const res4 = await plagiarismDetect(
        encodeBase64,
        generatedScanId,
        fileName,
        userId,
        ContentDetection
      );
    }
    return res.status(200).json({
      docDetails,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || 'something went wrong',
    });
  }
};

// show all the scan data with userId
const showScannedData = async (req, res) => {
  try {
    const userId = req.query.userId;
    const search = req.query.search;
    const pageNo = req.query.pageNo || 1;
    const limit = 6;
    const offset = (pageNo - 1) * limit;
    const [resultValue] = await mysqlPool.query(
      'SELECT s.*, ss.* FROM scans s LEFT JOIN scanScore ss ON s.scanId = ss.scanId WHERE s.userId = ? ORDER BY s.created_at DESC',
      [userId]
    );

    // pagination,search functionality,and total number of pages to retrieve
    let query =
      'SELECT s.*, ss.* FROM scans s LEFT JOIN scanScore ss ON s.scanId = ss.scanId WHERE s.userId = ?';
    const params = [userId];

    if (search) {
      query += ' AND s.DocumentName like ?';
      params.push(`%${search}%`);
    }
    query += ' ORDER BY s.created_at DESC';
    query += ' LIMIT ?,? ';
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
      'SELECT * FROM scans WHERE scanId =?',
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
const wordCountsFromStringAndDoc = async (req, res) => {
  const allowedMimeTypeForImage = ['image/png' , 'image/jpeg' ,'image/jpg']
  const selectedLanguageForImage = req.body.selectedLanguage
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
    if (req.file.mimetype === 'application/msword') {
      const extractor = new WordExtractor();
      const extracted = extractor.extract(filePath);
      await extracted.then(function (doc) {
        wordCount = doc.getBody().length;
      });
    }else if(req.file.mimetype ==='text/plain'){
      await countWordsInTextFile(filePath)
      .then(data => {
        wordCount=data
        console.log(`Total word count in text file: ${wordCount}`);
      })
    }else if(allowedMimeTypeForImage.includes(req.file.mimetype)){
     await Tesseract.recognize(filePath,selectedLanguageForImage).then((({data:{text}})=>{
         const words = text.split(/\s+/).filter(word => word.length > 0);
         wordCount = words.length;
      }))
    }else {
      const data = await officeParser.parseOfficeAsync(filePath);
      const textData = data.toString();
      wordCount = textData.split(/\b\S+\b/g).length;
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
      message: error.message || 'something went wrong',
    });
  }
};

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
      const message = 'file uploaded successfully'
      await mysqlPool.query(
        'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
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
    const message = 'file scanned successfully'
    await mysqlPool.query(
      'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
      [message, userId, 0]
    );
    return res.json({
      response,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message || 'something went wrong',
    });
  }
};

module.exports = {
  uploadDocAndTextInDb,
  showScannedData,
  showReportOfScannedData,
  wordCountsFromStringAndDoc,
  uploadDocAndStringForProofReadingEditing,
};
