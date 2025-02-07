const Router = require('express');
const { getAuthUrl, redirectToUpload, handleFileUploadCheckWords, fileUploadFromDrive } = require('../controllers/googleDriveIntegration');
const googleDriveRoutes = Router();

googleDriveRoutes.get('/auth/google',getAuthUrl);
googleDriveRoutes.get('/callback',redirectToUpload);
googleDriveRoutes.post('/uploadDriveFileCheckWords',handleFileUploadCheckWords)
googleDriveRoutes.post('/uploadDriveDataInMemory',fileUploadFromDrive)
module.exports = googleDriveRoutes;