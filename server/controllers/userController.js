const User = require('../models/User');

const getAllUsers = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name:  { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }
    const users = await User.find(query).select('name email avatar color').limit(20);
    res.json(users);
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, color },
      { new: true }
    );
    res.json(user);
  } catch (err) { next(err); }
};

const getNotifications = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    const sorted = user.notifications
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
    res.json(sorted);
  } catch (err) { next(err); }
};

const markNotificationRead = async (req, res, next) => {
  try {
    await User.updateOne(
      { _id: req.user._id, 'notifications._id': req.params.id },
      { $set: { 'notifications.$.read': true } }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $set: { 'notifications.$[].read': true } }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = {
  getAllUsers,
  updateProfile,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
