const { Router } = require('express');
const multer = require('multer');
const {
  uploadDocAndTextInDb,
  showScannedData,
  showReportOfScannedData,
  wordCountsFromStringAndDoc,
  uploadDocAndStringForProofReadingEditing,
  uploadImageFile
} = require('../controllers/file.controller.js');
const {
  showScanResults,
  showScanScore,
  resultCompletionWebhook,
  resultWebhook,
  exportResult,
  webhookScanStatus,
  storeResult,
  finalIdenticalCharsData,
  uploadingStatus,
  mailTransfer,
  pdfResultWebhook,
  crawledVersionResult,
  downloadPdfReport,
  getCompleteFile,
  getSourceFile,
  getResultsFile,
  removeScanResult,
  downloadPdfReportForBothFile,
  downloadPdfReportForAI,
  reportsDownloading,
  getSingleScan
} = require('../controllers/copyLeaks.controller.js');
const verifyJWTToken = require('../middleware/verifyToken.js');
// const openAICall = require('../controllers/openAIAPI.js');
// const uploadFileAskQues = require('../controllers/openAIAPI.js');
const fileRouter = Router();

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

// Create the multer instance
const upload = multer({ storage: storage });
fileRouter.post('/getSingleScan', getSingleScan)
fileRouter.post('/upload', upload.single('file'), uploadDocAndTextInDb);
fileRouter.get('/showscandata', showScannedData);
fileRouter.get('/showreport/:id', showReportOfScannedData);

fileRouter.post(
  '/uploadAndCheck',
  upload.single('file'),
  wordCountsFromStringAndDoc
);
fileRouter.post(
  '/proofreadingAndEditing',
  upload.single('file'),
  uploadDocAndStringForProofReadingEditing
);
fileRouter.post('/copyleaks/:userId/:status/:scanId', webhookScanStatus);
fileRouter.get('/showScanResults/:id', showScanResults);
fileRouter.get('/showScanScore/:id', showScanScore);
fileRouter.post(
  '/copyleaks/export/:userId/:scanId/:export_id/results/:result_id',
  resultWebhook
);
fileRouter.post(
  '/copyleaks/export/:userId/:scanId/:export_id/crawled-version',
  crawledVersionResult
);
fileRouter.post(
  '/copyleaks/export/:export_id/:scanId/pdf-report',
  pdfResultWebhook
);
fileRouter.post(
  '/copyleaks/export/:export_id/:status',
  resultCompletionWebhook
);
fileRouter.post('/exportScanResult/:scanId/:exportId', exportResult);
fileRouter.post('/storeResult', storeResult);
fileRouter.get('/finalIdenticalCharsData/:id', finalIdenticalCharsData);
// file uploading or text uploading status(for loader)
fileRouter.get('/uploadingStatus', uploadingStatus);
fileRouter.post('/mailTransfer', mailTransfer);
// fileRouter.post('/uploadFileAskQues', upload.single('file'),uploadFileAskQues);
fileRouter.post('/downloadPdfReport', downloadPdfReport);
fileRouter.post('/downloadPdfReportForAI', downloadPdfReportForAI);
fileRouter.post('/downloadPdfReportForBothFile', downloadPdfReportForBothFile);
fileRouter.post('/deleteFiles',removeScanResult)
// get source,complete and result data
fileRouter.get('/getSourceFile/:userId/:scanId', getSourceFile);
fileRouter.get('/getCompleteFile/:userId/:scanId', getCompleteFile);
fileRouter.get('/getResultsFile/:userId/:scanId/:id', getResultsFile);
fileRouter.post('/reportsDownloading',reportsDownloading)  //single or multiple report downloading

fileRouter.post('/uploadImage', upload.single('file'), uploadImageFile);


module.exports = {fileRouter,upload};
