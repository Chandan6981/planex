const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getAllUsers,
  updateProfile,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} = require('../controllers/userController');

router.get ('/',                        auth, getAllUsers);
router.put ('/profile',                 auth, updateProfile);
router.get ('/notifications',           auth, getNotifications);
router.put ('/notifications/read-all',  auth, markAllNotificationsRead);
router.put ('/notifications/:id/read',  auth, markNotificationRead);

module.exports = router;
