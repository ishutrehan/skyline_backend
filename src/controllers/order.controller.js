const { response } = require('express');
const mysqlPool = require('../db/db.js');
const {
  updateForAssignmentNotifictionInUser,
  updateForProofreadingNotifictionInUser,
} = require('../utils/updateNotificationInUser.js');

// get all the orders with userId
const createAssignmentWork = async (req, res) => {
  try {
    const {
      userId,
      editorId,
      levelOfStudy,
      subject,
      workRequired,
      deliveryDate,
      urgenecyForAssignment,
      wordsforassignments,
      typeOfAssignment,
      titleOfProject,
      additionalInformation,
      referenceStyle,
      structure,
      course,
      style,
      essentialSources,
      preferredSources,
      otherInformation,
      firstName,
      lastName,
      emailAddress,
      status,
      userComments,
    } = req.body;

    // console.log(req.files,"file")
    const docForReview = req?.files[0]?.filename;
    let additionalDocforReview = ''
    if(req?.files[1]){
      additionalDocforReview = req?.files[1].filename;
   }
    const [data] = await mysqlPool.query(
      'INSERT INTO orders (userId,editorId,levelOfStudy,subject,workRequired,deliveryDate,urgenecyForAssignment,wordsforassignments,docForReview,additionalDocforReview,typeOfAssignment,titleOfProject,additionalInformation,referenceStyle,structure,course,style,essentialSources,preferredSources,otherInformation,firstName,lastName,emailAddress,status,userComments) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        userId,
        editorId,
        levelOfStudy,
        subject,
        workRequired,
        deliveryDate,
        urgenecyForAssignment,
        wordsforassignments,
        docForReview,
        additionalDocforReview,
        typeOfAssignment,
        titleOfProject,
        additionalInformation,
        referenceStyle,
        structure,
        course,
        style,
        essentialSources,
        preferredSources,
        otherInformation,
        firstName,
        lastName,
        emailAddress,
        status,
        userComments,
      ]
    );
    // console.log(data, 'data');
    res.json({
      data,
      message: 'Order created success',
    });
  } catch (error) {
    console.log(error);
    res.json({
      message: error,
    });
  }
};

// show Assignments to user
const getAssignments = async (req, res) => {
  try {
    // console.log(req.params, 'abcd ', req.query);
    const userId = req.params.userId;
    const pageNo = req.query.pageNo || 1;
    const sortBy = req.query.sortBy;
    const limit = 8;
    const offSet = (pageNo - 1) * limit;
    if (!userId) {
      return res.json({
        message: 'user id not found',
      });
    }
    if (sortBy) {
      const [data] = await mysqlPool.query(
        'SELECT * FROM orders WHERE userId=? AND status = ?',
        [userId, sortBy]
      );
      const [paginationData] = await mysqlPool.query(
        'SELECT * FROM orders WHERE userId=? AND status=? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [userId, sortBy, limit, offSet]
      );
      const totalPages = Math.ceil(data.length / limit);
      res.status(200).json({
        paginationData,
        totalPages,
      });
    } else {
      const [data] = await mysqlPool.query(
        'SELECT * FROM orders WHERE userId=? AND editorId IS NOT NULL',
        [userId]
      );
      const [paginationData] = await mysqlPool.query(
        'SELECT * FROM orders WHERE userId=? AND editorId IS NOT NULL ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [userId, limit, offSet]
      );
      const totalPages = Math.ceil(data.length / limit);
      res.status(200).json({
        paginationData,
        totalPages,
      });
    }
  } catch (error) {
    // console.log(error);
    res.status(500).json({
      error: error.message || 'something went wrong',
    });
  }
};

// get details of order with order Id
const getAssignmentDetails = async (req, res) => {
  try {
    // console.log(req.params.orderId);
    const orderId = req.params.orderId;
    if (!orderId) {
      return res.json({
        message: 'not a valid orderId',
      });
    }
    const [orderDetails] = await mysqlPool.query(
      'SELECT * FROM orders WHERE orderId=?',
      [orderId]
    );
    res.status(200).json({
      orderDetails,
    });
  } catch (error) {
    // console.log(error, 'error');
    res.status(404).json({
      message: 'order not found',
    });
  }
};

// order review
const orderReview = async (req, res) => {
  try {
    const { orderId, firstName, lastName, email, feedbackMessage } = req.body;
    const [reviewData] = await mysqlPool.query(
      `INSERT INTO feedbacks (orderId,firstName,lastName,email,feedbackMessage) VALUES (?,?,?,?,?)`,
      [orderId, firstName, lastName, email, feedbackMessage]
    );
    if (!reviewData) {
      res.json({
        message: 'Invalid feedback',
      });
    }
    res.status(200).json({
      message: 'received feedback',
    });
  } catch (error) {
    console.log(error, 'error');
    res.status(error.status || 500).json({
      message: error.message || 'something went wrong',
    });
  }
};

// Editor
//show orders of a particular editors
const editorAssignments = async (req, res) => {
  try {
    const editorId = req.params.editorId;
    const pageNo = req.query.pageNo;
    const sortBy = req.query.sortBy;
    const limit = 8;
    const offSet = (pageNo - 1) * limit;

    if (!editorId) {
      return res.json({
        message: 'editor id not found',
      });
    }
    if (sortBy) {
      const [data] = await mysqlPool.query(
        'SELECT * FROM orders WHERE editorId=? AND status=? ',
        [editorId, sortBy]
      );
      const [paginationData] = await mysqlPool.query(
        'SELECT * FROM orders WHERE editorId=? AND status=? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [editorId, sortBy, limit, offSet]
      );
      const totalPages = Math.ceil(data.length / limit);
      res.status(200).json({
        paginationData,
        totalPages,
      });
    } else {
      const [data] = await mysqlPool.query(
        'SELECT * FROM orders WHERE editorId=?',
        [editorId]
      );
      const [paginationData] = await mysqlPool.query(
        'SELECT * FROM orders WHERE editorId=? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [editorId, limit, offSet]
      );
      const totalPages = Math.ceil(data.length / limit);
      res.status(200).json({
        paginationData,
        totalPages,
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || 'something went wrong',
    });
  }
};
const updateAssignmentStatusByAdmin= async(req,res)=>{
  try{  const { status, orderId} = req.body;

  console.log(orderId)
  const existorder = await mysqlPool.query(
    'SELECT * FROM orders WHERE orderId=?',
    [orderId]
  );
  console.log(existorder[0])
  if(existorder[0] && Object.keys(existorder[0]).length > 0){
    const data = await mysqlPool.query(
      'UPDATE orders SET status=? WHERE orderId=?',
      [status, orderId]
    );
    res.status(200).json({
      message:'updation successfull'
    });
  }
 else{
   const data2 = await mysqlPool.query(
     'UPDATE proofReadingEditing SET status=? WHERE proofReadingId=?',
     [status, orderId]
    );
    res.status(200).json({
      message:'updation successfull'
    });
    
  }
}
  catch (error) {
    res.status(error.status || 500).json({
      message: error.message || 'something went wrong',
    });
  }
}

//update orders by a editor with orderId
const updateAssignmentByEditor = async (req, res) => {
  try {
    // console.log(req.files, 'files');
    const { status, orderId, id, editor, admin, comment, title } = req.body;
    let reviewOfAssignment = '';
    req?.files.forEach((file, index) => {
      reviewOfAssignment = reviewOfAssignment + file?.filename + ',';
    });
    console.log(reviewOfAssignment, 'reviewOfAssignment');
    // const reviewOfAssignment = req?.file?.filename;
    const userId = parseInt(id, 10);
    const editorId = editor;
    const adminId = admin;

    const data = await mysqlPool.query(
      'UPDATE orders SET status=?,editorComments=?,reviewOfAssignment=? WHERE orderId=?',
      [status, comment, reviewOfAssignment, orderId]
    );

    // this condition is to notify editor himself
    if (status && editorId) {
      const message = 'Assignment Status Updated successfully';
      await mysqlPool.query(
        'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
        [message, editorId, 0]
      );
    }
    if (status == 'Rejected') {
      const message = `Assignment has been rejected By Editor `;
      await mysqlPool.query(
        'INSERT INTO notifications (message, role, seen) VALUES (?, ?, ?)',
        [message, 'admin', 0]
      );
    }

    // this condition is for user when assignment is completed
    if (status === 'Completed') {
      const message = 'Assignment Status Completed successfully';
      await mysqlPool.query(
        'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
        [message, userId, 0]
      );
    }
    if (comment) {
      const message = `Editor has Added some Comments Regarding your Assignment, title : " ${title}" ( ${orderId} )`;
      await mysqlPool.query(
        'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
        [message, userId, 0]
      );
    }
    res.json({
      data,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || 'something went wrong',
    });
  }
};

// admin
const allAssignment = async (req, res) => {
  try {
    const pageNo = req.query.pageNo || 1;
    const sortBy = req.query.sortBy;
    const limit = 8;
    const offSet = (pageNo - 1) * limit;
    if (sortBy) {
      const [data] = await mysqlPool.query(
        'SELECT * FROM orders WHERE status =?',
        [sortBy]
      );

      const [paginationData] = await mysqlPool.query(
        'SELECT * FROM orders WHERE status =? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [sortBy, limit, offSet]
      );
      const totalPages = Math.ceil(data.length / limit);
      res.status(200).json({
        paginationData,
        totalPages,
      });
    } else {
      const [data] = await mysqlPool.query('SELECT * FROM orders');

      const [paginationData] = await mysqlPool.query(
        'SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offSet]
      );
      const totalPages = Math.ceil(data.length / limit);
      res.status(200).json({
        paginationData,
        totalPages,
      });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || 'something went wrong',
    });
  }
};
//update orders by a editor with orderId
const updateAssignmentByAdmin = async (req, res) => {
  try {
    const id = req.params.id;
    const { editorId, admin } = req.body;
    const data = mysqlPool.query(
      'UPDATE orders SET editorId=? WHERE orderId=?',
      [editorId, id]
    );
    await updateForAssignmentNotifictionInUser(id, 'assignment');
    res.json({
      data,
    });
    const message = `Assignment has been assigned to Editor `;
    await mysqlPool.query(
      'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
      [message, admin, 0]
    );
  } catch (error) {
    console.log(error);
    res.status(error.status || 500).json({
      message: error.message || 'something went wrong',
    });
  }
};

// feedbacks (for editors)
const feedbacks = async (req, res) => {
  try {
    // const editorId = req.query.editorId;
    // const [data] = await mysqlPool.query(
    //   'SELECT * FROM feedbacks where editorId=?',
    //   [editorId]
    // );
    const pageNo = req.query.pageNo || 1;
    const dataPerPage = 8;
    const currentPageData = (pageNo - 1) * dataPerPage;
    const [totalData] = await mysqlPool.query('SELECT * FROM feedbacks');
    const [data] = await mysqlPool.query(
      'SELECT * FROM feedbacks ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [dataPerPage, currentPageData]
    );
    const totalPages = Math.ceil(totalData.length / dataPerPage);
    res.status(200).json({
      totalPages,
      data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error,
    });
  }
};

// proofreading updates
// admin
// show proofreading data
const showProofReadingEditingData = async (req, res) => {
  try {
    const pageNo = req.query.pageNo || 1;
    const limit = 8;
    const sortBy = req.query.sortBy;
    const offSet = (pageNo - 1) * limit;
    if (sortBy) {
      const [response] = await mysqlPool.query(
        `SELECT * FROM proofReadingEditing WHERE status = ?`,
        [sortBy]
      );

      const [paginationData] = await mysqlPool.query(
        `SELECT * FROM proofReadingEditing WHERE status = ?  ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [sortBy, limit, offSet]
      );
      const totalPages = Math.ceil(response.length / limit);
      res.json({
        paginationData,
        totalPages,
      });
    } else {
      const [response] = await mysqlPool.query(
        `SELECT * FROM proofReadingEditing`
      );

      const [paginationData] = await mysqlPool.query(
        `SELECT * FROM proofReadingEditing ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [limit, offSet]
      );
      const totalPages = Math.ceil(response.length / limit);
      res.json({
        paginationData,
        totalPages,
      });
    }
  } catch (error) {
    res.json({
      error,
    });
  }
};

// update proofReadings by admin
const updateProofReading = async (req, res) => {
  try {
    const proofReadingId = req.params.id;
    const { editorId, admin } = req.body;
    const [response] = await mysqlPool.query(
      `UPDATE proofReadingEditing SET editorId = ? WHERE proofReadingId = ?`,
      [editorId, proofReadingId]
    );
    // console.log('abcdxyz');
    await updateForProofreadingNotifictionInUser(
      proofReadingId,
      'proofreading'
    );
    res.json({
      message: 'proofreading updated successfully',
    });

    const message = 'Editor has been assigned to Proofreading assignment';
    await mysqlPool.query(
      'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
      [message, admin, 0]
    );
  } catch (error) {
    res.json({
      message: error,
    });
  }
};

// update proofreading and editing by editor
const updateProofReadingStatusAndDoc = async (req, res) => {
  const { status, proofReadingId, id, editor } = req.body;
  // console.log( 'lets check the status ',status)
  const userId = parseInt(id, 10);
  try {
    let proofReadingByEditor = '';

    // console.log(req.files,"files are")
    req?.files.forEach((file, index) => {
      proofReadingByEditor = proofReadingByEditor + file?.filename + ',';
    });
    const [data] = await mysqlPool.query(
      `UPDATE proofReadingEditing SET status=?,proofReadingFileByEditor=?  WHERE proofReadingId=?`,
      [status, proofReadingByEditor, proofReadingId]
    );
    if (status) {
      const message = 'Proofreading Status Updated successfully';
      await mysqlPool.query(
        'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
        [message, editor, 0]
      );
    }
    if (status == 'Rejected') {
      const message = ` Proofreading Assignment has been rejected By Editor`;
      await mysqlPool.query(
        'INSERT INTO notifications (message, role, seen) VALUES (?, ?, ?)',
        [message, 'admin', 0]
      );
    }
    if (status == 'Completed') {
      const message = 'Proofreading assignment Status Completed successfully';
      await mysqlPool.query(
        'INSERT INTO notifications (message, userId, seen) VALUES (?, ?, ?)',
        [message, userId, 0]
      );
    }
    res.json({
      message: 'Status updated successfully',
    });
  } catch (error) {
    res.json({
      error,
    });
  }
};
// show proofreading data to editors
const showAssignedProofReadingEditing = async (req, res) => {
  try {
    const id = req.params.id;
    const pageNo = req.query.pageNo;
    const sortBy = req.query.sortBy;
    const limit = 8;
    const offSet = (pageNo - 1) * limit;

    if (sortBy) {
      const [response] = await mysqlPool.query(
        `SELECT * FROM proofReadingEditing WHERE editorId=? AND status =?`,
        [id, sortBy]
      );
      const [paginationData] = await mysqlPool.query(
        'SELECT * FROM proofReadingEditing WHERE editorId=? AND status =? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [id, sortBy, limit, offSet]
      );
      const totalPages = Math.ceil(response.length / limit);
      res.status(200).json({
        paginationData,
        totalPages,
      });
    } else {
      const [response] = await mysqlPool.query(
        `SELECT * FROM proofReadingEditing WHERE editorId=?`,
        [id]
      );
      const [paginationData] = await mysqlPool.query(
        'SELECT * FROM proofReadingEditing WHERE editorId=? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [id, limit, offSet]
      );
      const totalPages = Math.ceil(response.length / limit);
      res.status(200).json({
        paginationData,
        totalPages,
      });
    }
  } catch (error) {
    res.status(400).json({ error });
  }
};
// editor,user and admin it gives myorder data to frontend
const getDetailsOfProofReadingEditing = async (req, res) => {
  // console.log('abcd');
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(404).json({
        message: 'id not found',
      });
    }
    const [response] = await mysqlPool.query(
      `SELECT * FROM proofReadingEditing WHERE proofReadingId=?`,
      [id]
    );
    res.json({
      response,
    });
  } catch (error) {
    console.log(error, 'error is');
    res.json({
      error,
    });
  }
};

//show proofreading data in user dashboard using userId
const showProofReadingEditingToUser = async (req, res) => {
  try {
    const userId = req.query.id;
    const pageNo = req.query.pageNo || 1;
    const sortBy = req.query.sortBy;
    const limit = 8;
    const offSet = (pageNo - 1) * limit;
    if (sortBy) {
      // console.log('lets search',search)
      const [data] = await mysqlPool.query(
        'SELECT * FROM proofReadingEditing WHERE userId = ? AND status = ?',
        [userId, sortBy]
      );

      const [paginationData] = await mysqlPool.query(
        'SELECT * FROM proofReadingEditing WHERE userId = ? AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [userId, sortBy, limit, offSet]
      );
      const totalPages = Math.ceil(data.length / limit);
      res.status(200).json({
        totalPages,
        paginationData,
      });
    } else {
      const [data] = await mysqlPool.query(
        'SELECT * FROM proofReadingEditing where userId=? AND userId IS NOT NULL',
        [userId]
      );
      const [paginationData] = await mysqlPool.query(
        'SELECT * FROM proofReadingEditing where userId=? AND userId IS NOT NULL ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [userId, limit, offSet]
      );
      const totalPages = Math.ceil(data.length / limit);
      res.status(200).json({
        totalPages,
        paginationData,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(404).json({
      error: 'Something went wrong',
    });
  }
};

// findout last 5 orders from proofreading and assignment(using it for user dashboard)
const getLastOrdersInUserDashboard = async (req, res) => {
  try {
    const id = req.query.id;
    const [data] = await mysqlPool.query(
      `(SELECT created_at, status, deliveryDate,proofReadingId AS orderId, 'proofreading' AS type FROM proofReadingEditing WHERE userId=?)
      UNION ALL
      (SELECT created_at, status, deliveryDate,orderId, 'assignment' AS type FROM orders WHERE userId=?)
      ORDER BY created_at DESC`,
      [id, id]
    );
    const [data1] = await mysqlPool.query(
      `(SELECT created_at, status, deliveryDate,proofReadingId AS orderId, 'proofreading' AS type FROM proofReadingEditing WHERE userId=? AND status='Completed')
      UNION ALL
      (SELECT created_at, status, deliveryDate,orderId, 'assignment' AS type FROM orders WHERE userId=? AND status='Completed')
      ORDER BY created_at DESC LIMIT 5`,
      [id, id]
    );
    res.status(200).json({
      lastFiveOrders: data1,
      queuedOrders: data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error,
    });
  }
};

// findout last 5 orders and proofreading and assignment(will use it for admin dashboard)
const showOrdersInAdminDashboard = async (req, res) => {
  try {
    const [data] =
      await mysqlPool.query(`(SELECT created_at, status, deliveryDate,proofReadingId AS orderId ,'proofreading' AS type FROM proofReadingEditing) UNION ALL (SELECT created_at, status, deliveryDate,orderId, 'assignment' AS type FROM orders)
      ORDER BY created_at DESC`);
    const [data1] =
      await mysqlPool.query(`(SELECT created_at, status, deliveryDate,proofReadingId AS orderId ,'proofreading' AS type FROM proofReadingEditing where status='Completed') UNION ALL (SELECT created_at, status, deliveryDate,orderId, 'assignment' AS type FROM orders where status='Completed')
      ORDER BY created_at DESC LIMIT 5`);
    res.status(200).json({
      lastFiveOrders: data1,
      queuedOrders: data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error,
    });
  }
};

// findout last 5 orders and proofreading and assignment (will use it for editor dashboard)
const showOrdersInEditorDashboard = async (req, res) => {
  try {
    const editorId = req.query.id;
    const [data] = await mysqlPool.query(
      `(SELECT created_at, status, deliveryDate,proofReadingId AS orderId ,'proofreading' AS type FROM proofReadingEditing where editorId=?) UNION ALL (SELECT created_at, status, deliveryDate,orderId, 'assignment' AS type FROM orders where editorId=?)
      ORDER BY created_at DESC`,
      [editorId, editorId]
    );
    const [data1] = await mysqlPool.query(
      `(SELECT created_at, status, deliveryDate,proofReadingId AS orderId ,'proofreading' AS type FROM proofReadingEditing where editorId=? AND status='Completed') UNION ALL (SELECT created_at, status, deliveryDate,orderId, 'assignment' AS type FROM orders where editorId=? AND status='Completed')
      ORDER BY created_at DESC LIMIT 5`,
      [editorId, editorId]
    );
    res.status(200).json({
      lastFiveOrders: data1,
      queuedOrders: data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error,
    });
  }
};
module.exports = {
  createAssignmentWork,
  getAssignmentDetails,
  getAssignments,
  editorAssignments,
  updateAssignmentByEditor,
  orderReview,
  allAssignment,
  feedbacks,
  updateAssignmentByAdmin,
  updateProofReading,
  showProofReadingEditingData,
  updateProofReadingStatusAndDoc,
  getDetailsOfProofReadingEditing,
  showAssignedProofReadingEditing,
  showProofReadingEditingToUser,
  getLastOrdersInUserDashboard,
  showOrdersInAdminDashboard,
  updateAssignmentStatusByAdmin,
  showOrdersInEditorDashboard,
};
