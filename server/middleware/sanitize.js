const xss = require('xss');

// Fields to sanitize on task/project/comment bodies
const TASK_FIELDS    = ['title', 'description', 'tags'];
const COMMENT_FIELDS = ['text'];
const PROJECT_FIELDS = ['name', 'description'];

const sanitizeValue = (val) => {
  if (typeof val === 'string') return xss(val.trim());
  if (Array.isArray(val))      return val.map(v => typeof v === 'string' ? xss(v.trim()) : v);
  return val;
};

const sanitizeBody = (fields) => (req, res, next) => {
  if (req.body) {
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        req.body[field] = sanitizeValue(req.body[field]);
      }
    });
  }
  next();
};

module.exports = {
  sanitizeTask:    sanitizeBody(TASK_FIELDS),
  sanitizeComment: sanitizeBody(COMMENT_FIELDS),
  sanitizeProject: sanitizeBody(PROJECT_FIELDS),
};