const Router = require('express');
const {
  getNotifications,
  deleteNotifications,
  deleteAllNotifications,
  getUnreadNotifications,
  markNotificationsAsSeen
} = require('../controllers/notification.controller');
const notificationsRoute = Router();

notificationsRoute.get('/showNotifications', getNotifications);
notificationsRoute.delete('/deleteNotifications', deleteNotifications);
notificationsRoute.delete('/deleteAllNotifications', deleteAllNotifications);
notificationsRoute.get('/getUnreadNotifications', getUnreadNotifications);
notificationsRoute.get('/markNotificationsAsSeen', markNotificationsAsSeen);

module.exports = notificationsRoute;
