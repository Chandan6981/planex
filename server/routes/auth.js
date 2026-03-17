const express     = require('express');
const router      = express.Router();
const rateLimit   = require('express-rate-limit');
const auth        = require('../middleware/auth');
const { register, login, getMe, updateTheme } = require('../controllers/authController');
const { validateRegister, validateLogin }     = require('../validators/authValidator');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { message: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders:   false,
});

router.post('/register', authLimiter, validateRegister, register);
router.post('/login',    authLimiter, validateLogin,    login);
router.get ('/me',  auth, getMe);
router.put ('/theme', auth, updateTheme);

module.exports = router;
