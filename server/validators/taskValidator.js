const { TASK_STATUS, TASK_PRIORITY } = require('../constants');

const VALID_STATUSES   = Object.values(TASK_STATUS);
const VALID_PRIORITIES = Object.values(TASK_PRIORITY);

const validateCreateTask = (req, res, next) => {
  const { title, status, priority } = req.body;

  if (!title?.trim())
    return res.status(400).json({ message: 'Task title is required' });

  if (title.trim().length > 200)
    return res.status(400).json({ message: 'Title must be under 200 characters' });

  if (status && !VALID_STATUSES.includes(status))
    return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });

  if (priority && !VALID_PRIORITIES.includes(priority))
    return res.status(400).json({ message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });

  next();
};

const validateUpdateTask = (req, res, next) => {
  const { title, status, priority } = req.body;

  if (title !== undefined) {
    if (!title?.trim())
      return res.status(400).json({ message: 'Task title cannot be empty' });
    if (title.trim().length > 200)
      return res.status(400).json({ message: 'Title must be under 200 characters' });
  }

  if (status && !VALID_STATUSES.includes(status))
    return res.status(400).json({ message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });

  if (priority && !VALID_PRIORITIES.includes(priority))
    return res.status(400).json({ message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });

  next();
};

module.exports = { validateCreateTask, validateUpdateTask };
