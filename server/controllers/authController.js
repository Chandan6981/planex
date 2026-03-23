const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── Token generators ──────────────────────────────────────────────────────────
const generateAccessToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });

const generateRefreshToken = (userId) =>
  jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

// httpOnly cookie options for refresh token
const COOKIE_OPTS = {
  httpOnly: true,                                  // JS cannot read it — XSS safe
  secure:   process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict',                              // CSRF protection
  maxAge:   7 * 24 * 60 * 60 * 1000,              // 7 days in ms
  path:     '/api/auth',                           // only sent on auth routes
};

// ── Register ──────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser)
      return res.status(400).json({ message: 'Email already in use' });

    const user         = new User({ name, email, password });
    await user.save();

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    res.status(201).json({ token: accessToken, user });
  } catch (err) { next(err); }
};

// ── Login ─────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    res.json({ token: accessToken, user });
  } catch (err) { next(err); }
};

// ── Refresh — issues new accessToken using refreshToken cookie ────────────────
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token)
      return res.status(401).json({ message: 'No refresh token' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      // Refresh token expired or invalid — force re-login
      res.clearCookie('refreshToken', { ...COOKIE_OPTS, maxAge: 0 });
      return res.status(401).json({ message: 'Refresh token expired. Please log in again.' });
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      res.clearCookie('refreshToken', { ...COOKIE_OPTS, maxAge: 0 });
      return res.status(401).json({ message: 'User not found' });
    }

    // Issue new access token — also rotate refresh token for security
    const newAccessToken  = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTS);
    res.json({ token: newAccessToken });
  } catch (err) { next(err); }
};

// ── Logout — clear refresh token cookie ──────────────────────────────────────
const logout = (req, res) => {
  res.clearCookie('refreshToken', { ...COOKIE_OPTS, maxAge: 0 });
  res.json({ message: 'Logged out successfully' });
};

// ── Get current user ──────────────────────────────────────────────────────────
const getMe = (req, res) => res.json(req.user);

// ── Update theme ──────────────────────────────────────────────────────────────
const updateTheme = async (req, res, next) => {
  try {
    const { theme } = req.body;
    await User.findByIdAndUpdate(req.user._id, { theme });
    res.json({ theme });
  } catch (err) { next(err); }
};

module.exports = { register, login, refresh, logout, getMe, updateTheme };