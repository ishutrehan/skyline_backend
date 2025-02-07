const Router = require('express');
const {
  createEditor,
  getEditors,
  UpdateEditors
  // loginEditor,
} = require('../controllers/editor.controller');
const editorsRoute = Router();
editorsRoute.post('/create', createEditor);
editorsRoute.get('/showEditors', getEditors);
editorsRoute.put('/updateEditors', UpdateEditors);
// editorsRoute.post('/login',loginEditor)
module.exports = editorsRoute;
