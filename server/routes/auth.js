const router      = require('express').Router();
const rateLimit   = require('express-rate-limit');
const auth        = require('../middleware/auth');
const { register, login, refresh, logout, getMe, updateTheme } =
  require('../controllers/authController');
const { validateRegister, validateLogin } = require('../validators/authValidator');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validateRegister, register);
router.post('/login',    authLimiter, validateLogin,    login);
router.post('/refresh',  refresh);    // no auth middleware — uses cookie
router.post('/logout',   logout);     // no auth middleware — just clears cookie
router.get ('/me',       auth, getMe);
router.put ('/theme',    auth, updateTheme);

module.exports = router;