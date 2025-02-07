const { Router } = require('express');
const {
  getAssignmentDetails,
  orderReview,
  feedbacks,
  updateAssignmentByAdmin,
  editorAssignments,
  updateAssignmentByEditor,
  allAssignment,
  showProofReadingEditingData,
  updateProofReadingStatusAndDoc,
  updateProofReading,
  getDetailsOfProofReadingEditing,
  showAssignedProofReadingEditing,
  createAssignmentWork,
  getAssignments,
  showProofReadingEditingToUser,
  getLastOrders,
  showOrdersInAdminDashboard,
  showOrdersInEditorDashboard,
  getLastOrdersInUserDashboard,
  updateAssignmentStatusByAdmin
} = require('../controllers/order.controller.js');

const {upload} = require('./file.route');
const verifyJWTToken = require('../middleware/verifyToken.js');
const orderRoute = Router();
// orderRoute.post('/createorders',upload.single('file'), createAssignmentWork);
orderRoute.post('/createorders',upload.array('file'), createAssignmentWork);
orderRoute.get('/getorders/:userId', getAssignments);
orderRoute.get('/getorderdetails/:orderId', getAssignmentDetails);
orderRoute.get('/getEditorAssignments/:editorId', editorAssignments);
// orderRoute.put('/updateOrders',upload.single('file'), updateAssignmentByEditor);
orderRoute.put('/updateOrders',upload.array('file'), updateAssignmentByEditor);
orderRoute.put('/updateOrdersStatusByAdmin', updateAssignmentStatusByAdmin);
orderRoute.post('/orderReview',orderReview)
orderRoute.get('/allOrders',allAssignment)
orderRoute.get('/feedbacks',feedbacks)
orderRoute.put('/updateAssignment/:id',updateAssignmentByAdmin)
orderRoute.get('/showProofReadingEditingData',showProofReadingEditingData)
// orderRoute.put('/updateProofReadingStatus',upload.single('file'),updateProofReadingStatusAndDoc)
orderRoute.put('/updateProofReadingStatus',upload.array('file'),updateProofReadingStatusAndDoc)

orderRoute.put('/updateProofReading/:id',updateProofReading) //admin
orderRoute.get('/getDetails/:id',getDetailsOfProofReadingEditing)
orderRoute.get('/showAssignedProofReadingEditing/:id',showAssignedProofReadingEditing)
orderRoute.get('/showProofReadingEditingToUser',showProofReadingEditingToUser)
orderRoute.get('/getLastOrders',getLastOrdersInUserDashboard);
orderRoute.get('/showOrdersInAdminDashboard',showOrdersInAdminDashboard)
orderRoute.get('/showOrdersInEditorDashboard',showOrdersInEditorDashboard)
module.exports = orderRoute;
