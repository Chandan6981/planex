const mongoose = require('mongoose');
const { Types: { ObjectId } } = mongoose;

const Task    = require('../models/Task');
const User    = require('../models/User');
const { emitTask }                       = require('../socket/socketHelpers');
const { TASK_STATUS, NOTIFICATION_TYPE } = require('../constants');
const { pushToQueue, QUEUE_EVENTS }      = require('../services/queueService');
const { deleteFile }                     = require('../services/s3Service');

const toObjId = id => new ObjectId(id.toString());
const POPULATE_USER    = 'name email color avatar';
const POPULATE_PROJECT = 'name color icon';

const getAllTasks = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.project)  filter.project  = req.query.project;
    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    if (req.query.myTasks) {
      filter.$or = [
        { assignees: req.user._id },
        { createdBy: req.user._id }
      ];
    }

    if (req.query.page) {
      const page  = Math.max(1, parseInt(req.query.page)  || 1);
      const limit = Math.min(100, parseInt(req.query.limit) || 50);
      const skip  = (page - 1) * limit;

      const [tasks, total] = await Promise.all([
        Task.find(filter)
          .populate('assignees', POPULATE_USER)
          .populate('createdBy', POPULATE_USER)
          .populate('project',   POPULATE_PROJECT)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Task.countDocuments(filter)
      ]);
      return res.json({ tasks, pagination: { total, page, pages: Math.ceil(total / limit), limit } });
    }

    const tasks = await Task.find(filter)
      .populate('assignees', POPULATE_USER)
      .populate('createdBy', POPULATE_USER)
      .populate('project',   POPULATE_PROJECT)
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) { next(err); }
};

const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignees',         POPULATE_USER)
      .populate('createdBy',         POPULATE_USER)
      .populate('comments.author',   POPULATE_USER)
      .populate('activityLog.user',  POPULATE_USER)
      .populate('subtasks.assignee', POPULATE_USER);

    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) { next(err); }
};

const createTask = async (req, res, next) => {
  try {
    const assigneeSet = [...new Set([
      req.user._id.toString(),
      ...(req.body.assignees || []).map(a => a.toString())
    ])];
    const assignees = assigneeSet.map(toObjId);

    const task = new Task({
      ...req.body,
      assignees,
      project:   req.body.project || null,
      createdBy: req.user._id
    });
    await task.save();
    await task.populate('assignees', POPULATE_USER);
    await task.populate('createdBy', POPULATE_USER);
    await task.populate('project',   POPULATE_PROJECT);

    for (const a of task.assignees) {
      if (a._id.toString() === req.user._id.toString()) continue;

      await User.findByIdAndUpdate(a._id, {
        $push: { notifications: {
          message: `${req.user.name} assigned you to "${task.title}"`,
          type:    NOTIFICATION_TYPE.TASK,
          link:    `/tasks/${task._id}`
        }}
      });

      req.io.to(`user:${a._id}`).emit('notification:new', {
        message: `${req.user.name} assigned you to "${task.title}"`,
        type:    NOTIFICATION_TYPE.TASK
      });

      await pushToQueue(QUEUE_EVENTS.TASK_ASSIGNED, {
        to:           a.email,
        toName:       a.name,
        assignerName: req.user.name,
        taskTitle:    task.title,
        taskId:       task._id.toString()
      });
    }

    emitTask(req.io, 'task:created', task);
    res.status(201).json(task);
  } catch (err) { next(err); }
};

const bulkUpdateTasks = async (req, res, next) => {
  try {
    const { taskIds, update } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0)
      return res.status(400).json({ message: 'taskIds must be a non-empty array' });

    if (taskIds.length > 100)
      return res.status(400).json({ message: 'Cannot bulk update more than 100 tasks at once' });

    const ALLOWED = ['status', 'priority', 'column', 'dueDate', 'assignees'];
    const safeUpdate = {};
    for (const key of Object.keys(update || {})) {
      if (ALLOWED.includes(key)) safeUpdate[key] = update[key];
    }

    if (Object.keys(safeUpdate).length === 0)
      return res.status(400).json({ message: 'No valid fields to update' });

    await Task.updateMany({ _id: { $in: taskIds } }, { $set: safeUpdate });
    const tasks = await Task.find({ _id: { $in: taskIds } })
      .populate('assignees', POPULATE_USER)
      .populate('project',   POPULATE_PROJECT);

    tasks.forEach(t => emitTask(req.io, 'task:updated', t));
    res.json({ message: 'Tasks updated', count: tasks.length });
  } catch (err) { next(err); }
};

const updateTask = async (req, res, next) => {
  try {
    const oldTask = await Task.findById(req.params.id)
      .populate('assignees', POPULATE_USER);
    if (!oldTask) return res.status(404).json({ message: 'Task not found' });

    const oldAssigneeIds = (oldTask.assignees || []).map(a => (a._id || a).toString());

    const activityEntries = [];
    for (const field of ['title', 'status', 'priority', 'column', 'dueDate']) {
      if (req.body[field] !== undefined && String(req.body[field]) !== String(oldTask[field])) {
        activityEntries.push({
          action:   'updated', field,
          oldValue: String(oldTask[field]),
          newValue: String(req.body[field]),
          user:     req.user._id
        });
      }
    }

    const updateBody = { ...req.body };
    if (updateBody.assignees) {
      updateBody.assignees = updateBody.assignees.map(a => toObjId(a));
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { ...updateBody, $push: { activityLog: { $each: activityEntries } } },
      { new: true }
    ).populate('assignees',        POPULATE_USER)
     .populate('createdBy',        POPULATE_USER)
     .populate('comments.author',  POPULATE_USER)
     .populate('activityLog.user', POPULATE_USER)
     .populate('project',          POPULATE_PROJECT);

    const newAssigneeIds = (task.assignees || []).map(a => (a._id || a).toString());
    for (const uid of newAssigneeIds.filter(id => !oldAssigneeIds.includes(id))) {
      if (uid === req.user._id.toString()) continue;

      const assignee = task.assignees.find(a => (a._id || a).toString() === uid);
      await User.findByIdAndUpdate(uid, {
        $push: { notifications: {
          message: `${req.user.name} assigned you to "${task.title}"`,
          type:    NOTIFICATION_TYPE.TASK,
          link:    `/tasks/${task._id}`
        }}
      });
      req.io.to(`user:${uid}`).emit('notification:new', {
        message: `${req.user.name} assigned you to "${task.title}"`,
        type:    NOTIFICATION_TYPE.TASK
      });

      if (assignee?.email) {
        await pushToQueue(QUEUE_EVENTS.TASK_ASSIGNED, {
          to:           assignee.email,
          toName:       assignee.name,
          assignerName: req.user.name,
          taskTitle:    task.title,
          taskId:       task._id.toString()
        });
      }
    }

    emitTask(req.io, 'task:updated', task, oldAssigneeIds);
    res.json(task);
  } catch (err) { next(err); }
};

const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignees', POPULATE_USER);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (task.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the task creator can delete this task' });

    if (task.attachments?.length > 0) {
      await Promise.all(task.attachments.map(a => deleteFile(a.url)));
    }

    const assigneeIds = (task.assignees || []).map(a => (a._id || a).toString());
    const creatorId   = (task.createdBy?._id || task.createdBy)?.toString();
    const projectId   = task.project?._id || task.project;

    await Task.findByIdAndDelete(req.params.id);

    if (projectId) req.io.to(`project:${projectId}`).emit('task:deleted', req.params.id);
    [...new Set([...assigneeIds, creatorId].filter(Boolean))]
      .forEach(uid => req.io.to(`user:${uid}`).emit('task:deleted', req.params.id));

    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
};

const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim())
      return res.status(400).json({ message: 'Comment text is required' });
    if (text.trim().length > 2000)
      return res.status(400).json({ message: 'Comment must be under 2000 characters' });

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { comments: { text: text.trim(), author: req.user._id } } },
      { new: true }
    ).populate('comments.author', POPULATE_USER)
     .populate('assignees',       POPULATE_USER)
     .populate('createdBy',       POPULATE_USER)
     .populate('project',         POPULATE_PROJECT);

    for (const a of (task.assignees || [])) {
      if (a._id.toString() === req.user._id.toString()) continue;
      await pushToQueue(QUEUE_EVENTS.COMMENT_ADDED, {
        to:            a.email,
        toName:        a.name,
        commenterName: req.user.name,
        taskTitle:     task.title,
        taskId:        task._id.toString(),
        commentText:   text.trim()
      });
    }

    emitTask(req.io, 'task:updated', task);
    res.json(task);
  } catch (err) { next(err); }
};

const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const attachment = {
      filename:     req.file.key,
      originalName: req.file.originalname,
      mimetype:     req.file.mimetype,
      size:         req.file.size,
      url:          req.file.location,
      uploadedBy:   req.user._id,
      uploadedAt:   new Date()
    };

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          attachments:  attachment,
          activityLog: {
            action: 'uploaded', field: 'attachment',
            oldValue: '', newValue: req.file.originalname,
            user: req.user._id
          }
        }
      },
      { new: true }
    ).populate('assignees', POPULATE_USER)
     .populate('createdBy', POPULATE_USER)
     .populate('project',   POPULATE_PROJECT);

    if (!task) return res.status(404).json({ message: 'Task not found' });

    emitTask(req.io, 'task:updated', task);
    res.json({ attachment, task });
  } catch (err) { next(err); }
};

const deleteAttachment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const attachment = task.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    const isUploader = attachment.uploadedBy.toString() === req.user._id.toString();
    const isCreator  = task.createdBy.toString()        === req.user._id.toString();
    if (!isUploader && !isCreator)
      return res.status(403).json({ message: 'Not authorized to delete this attachment' });

    await deleteFile(attachment.url);

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { $pull: { attachments: { _id: req.params.attachmentId } } },
      { new: true }
    ).populate('assignees', POPULATE_USER)
     .populate('project',   POPULATE_PROJECT);

    emitTask(req.io, 'task:updated', updatedTask);
    res.json({ message: 'Attachment deleted', task: updatedTask });
  } catch (err) { next(err); }
};

const updateSubtask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, 'subtasks._id': req.params.subtaskId },
      { $set: { 'subtasks.$.completed': req.body.completed, 'subtasks.$.title': req.body.title } },
      { new: true }
    ).populate('assignees', POPULATE_USER)
     .populate('project',   POPULATE_PROJECT);

    emitTask(req.io, 'task:updated', task);
    res.json(task);
  } catch (err) { next(err); }
};

const addSubtask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { $push: { subtasks: { title: req.body.title } } },
      { new: true }
    ).populate('assignees', POPULATE_USER)
     .populate('project',   POPULATE_PROJECT);

    emitTask(req.io, 'task:updated', task);
    res.json(task);
  } catch (err) { next(err); }
};

module.exports = {
  getAllTasks, getTask, createTask,
  bulkUpdateTasks, updateTask, deleteTask,
  addComment, uploadAttachment, deleteAttachment,
  updateSubtask, addSubtask
};