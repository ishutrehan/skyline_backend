const {Router} = require('express');
const uploadFileAskQues = require('../controllers/openAIAPI');
const multer = require('multer');

const openAIApiRoutes = Router();
// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, './questionAnswer');
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    },
  });
  // Create the multer instance
const upload = multer({ storage: storage });
openAIApiRoutes.post('/uploadFileAskQues',upload.single('file'),uploadFileAskQues)
module.exports = openAIApiRoutes;