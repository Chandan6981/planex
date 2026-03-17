const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser)
      return res.status(400).json({ message: 'Email already in use' });

    const user  = new User({ name, email, password });
    await user.save();
    const token = generateToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (err) { next(err); }
};

const getMe = (req, res) => res.json(req.user);

const updateTheme = async (req, res, next) => {
  try {
    const { theme } = req.body;
    await User.findByIdAndUpdate(req.user._id, { theme });
    res.json({ theme });
  } catch (err) { next(err); }
};

module.exports = { register, login, getMe, updateTheme };
