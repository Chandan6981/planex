const express       = require('express');
const router        = express.Router();
const rateLimit     = require('express-rate-limit');
const auth          = require('../middleware/auth');
const validateObjId = require('../middleware/validateObjectId');
const { sanitizeTask, sanitizeComment } = require('../middleware/sanitize');
const { upload, uploadAudio } = require('../services/s3Service');
const {
  getAllTasks, getTask, createTask, bulkUpdateTasks, updateTask, deleteTask,
  addComment, addVoiceComment, deleteComment,
  uploadAttachment, deleteAttachment, updateSubtask, addSubtask
} = require('../controllers/taskController');
const { validateCreateTask, validateUpdateTask } = require('../validators/taskValidator');

// Rate limit file uploads — 10 per minute per user
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { message: 'Too many uploads. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get ('/',                                    auth, getAllTasks);
router.post('/',                                    auth, validateCreateTask, sanitizeTask, createTask);
router.put ('/bulk/update',                         auth, bulkUpdateTasks);
router.get ('/:id',                                 auth, validateObjId, getTask);
router.put ('/:id',                                 auth, validateObjId, validateUpdateTask, sanitizeTask, updateTask);
router.delete('/:id',                               auth, validateObjId, deleteTask);

// Comments
router.post  ('/:id/comments',                      auth, validateObjId, sanitizeComment, addComment);
router.post  ('/:id/comments/voice',                auth, validateObjId, uploadLimiter, uploadAudio.single('audio'), addVoiceComment);
router.delete('/:id/comments/:commentId',           auth, validateObjId, deleteComment);

// Attachments
router.post  ('/:id/attachments',                   auth, validateObjId, uploadLimiter, upload.single('file'), uploadAttachment);
router.delete('/:id/attachments/:attachmentId',     auth, validateObjId, deleteAttachment);

// Subtasks
router.put ('/:id/subtasks/:subtaskId',             auth, validateObjId, updateSubtask);
router.post('/:id/subtasks',                        auth, validateObjId, addSubtask);

module.exports = router;