const mysqlPool = require('../db/db.js');

const getNotifications = async (req, res) => {
  const { userId, userType } = req.query;
  const pageNo = req.query.pageNo || 1;
  const limit = 7;
  const offSet = (pageNo - 1) * limit;
  try {
    if (userId && userType !== 'admin') {
      const query1 = 'SELECT * FROM notifications WHERE userId = ?';
      const [data] = await mysqlPool.query(query1, [userId]);
      const query =
        'SELECT * FROM notifications WHERE userId = ? ORDER BY notificationId DESC LIMIT ? OFFSET ?';
      const [rows] = await mysqlPool.query(query, [userId, limit, offSet]);
      const totalPages = Math.ceil(data.length / limit);
      res.status(200).json({
        success: true,
        totalPages,
        rows,
      });
    }
    if (userType == 'admin') {
      const query1 = 'SELECT * FROM notifications WHERE role = ? OR userId =?';
      const [data] = await mysqlPool.query(query1, ['admin', userId]);
      const query =
        'SELECT * FROM notifications WHERE role = ? OR userId =? ORDER BY notificationId DESC LIMIT ? OFFSET ?';
      const [rows] = await mysqlPool.query(query, [
        'admin',
        userId,
        limit,
        offSet,
      ]);
      const totalPages = Math.ceil(data.length / limit);
      res.status(200).json({
        success: true,
        totalPages,
        rows,
      });
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

const deleteNotifications = async (req, res) => {
  const { notificationId } = req.query;
  try {
    const selectQuery = 'SELECT * FROM notifications WHERE notificationId = ?';
    const [rows] = await mysqlPool.query(selectQuery, [notificationId]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    const deleteQuery = 'DELETE FROM notifications WHERE notificationId = ?';
    await mysqlPool.query(deleteQuery, [notificationId]);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

const deleteAllNotifications = async (req, res) => {
  try {
    const response = await mysqlPool.query('DELETE FROM notifications');
    res.json({
      success: true,
      msg: 'done',
    });
  } catch (error) {
    console.error(error);
  }
};

const getUnreadNotifications = async (req, res) => {
  const { userId, type } = req.query;
  let msgCount = 0;
  try {
    if (type == 'admin') {
      const query1 = 'SELECT * FROM notifications WHERE seen = 0 AND role = ?';
      const [data] = await mysqlPool.query(query1, [type]);
      msgCount = data.length;
    }
    if (userId) {
      const query1 =
        'SELECT * FROM notifications WHERE seen = 0 AND userId = ?';
      const [data] = await mysqlPool.query(query1, [userId]);
      if (msgCount === 0) {
        res.json({
          success: true,
          unreadmsg: data.length,
        });
      } else {
        res.json({
          success: true,
          unreadmsg: data.length + msgCount,
        });
      }
    }
  } catch (error) {
    console.error(error);
  }
};

const markNotificationsAsSeen = async (req, res) => {
  const { userId, list, type } = req.query;
  const arr = JSON.parse(list);
  const notificationIds = arr.map((item) => item.notificationId);
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return res.status(400).json({
      success: false,
      msg: 'Invalid or empty notificationIds array',
    });
  }

  try {
    if (type == 'admin') {
      const query =
        'UPDATE notifications SET seen = 1 WHERE userId = ? AND notificationId IN (?)';
      await mysqlPool.query(query, [userId, notificationIds]);
      const query1 =
        'UPDATE notifications SET seen = 1 WHERE role = ? AND notificationId IN (?)';
      await mysqlPool.query(query1, ['admin', notificationIds]);
      res.json({
        success: true,
        msg: 'Selected notifications marked as seen',
      });
    } else {
      const query =
        'UPDATE notifications SET seen = 1 WHERE userId = ? AND notificationId IN (?)';
      await mysqlPool.query(query, [userId, notificationIds]);
      res.json({
        success: true,
        msg: 'Selected notifications marked as seen',
      });
    }
  } catch (error) {
    console.error('Error marking notifications as seen:', error);

    res.status(500).json({
      success: false,
      msg: 'Error marking notifications as seen',
    });
  }
};

module.exports = {
  getNotifications,
  deleteNotifications,
  deleteAllNotifications,
  getUnreadNotifications,
  markNotificationsAsSeen,
};
