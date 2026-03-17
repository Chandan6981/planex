const mongoose = require('mongoose');
const { emitProject }  = require('../socket/socketHelpers');
const { TASK_STATUS }  = require('../constants');
const Project  = require('../models/Project');
const Task     = require('../models/Task');

const POPULATE_USER = 'name email color avatar';

const getAllProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
      status: { $ne: 'archived' }
    }).populate('owner',        POPULATE_USER)
      .populate('members.user', POPULATE_USER)
      .sort({ updatedAt: -1 });

    const projectIds = projects.map(p => p._id);
    const taskCounts = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: {
          _id:            '$project',
          totalTasks:     { $sum: 1 },
          completedTasks: { $sum: { $cond: [{ $eq: ['$status', TASK_STATUS.DONE] }, 1, 0] } }
      }}
    ]);

    const countMap = {};
    taskCounts.forEach(c => { countMap[c._id.toString()] = c; });

    const projectsWithCounts = projects.map(p => ({
      ...p.toObject(),
      totalTasks:     countMap[p._id.toString()]?.totalTasks     || 0,
      completedTasks: countMap[p._id.toString()]?.completedTasks || 0,
    }));

    res.json(projectsWithCounts);
  } catch (err) { next(err); }
};

const createProject = async (req, res, next) => {
  try {
    const { name, description, color, icon, dueDate, isPrivate, tags } = req.body;
    const project = new Project({
      name, description, color, icon, dueDate, isPrivate, tags,
      owner:   req.user._id,
      members: [{ user: req.user._id, role: 'owner' }]
    });
    await project.save();
    await project.populate('owner',        POPULATE_USER);
    await project.populate('members.user', POPULATE_USER);
    res.status(201).json(project);
  } catch (err) { next(err); }
};

const getProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
    }).populate('owner',        POPULATE_USER)
      .populate('members.user', POPULATE_USER);

    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) { next(err); }
};

const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('owner',        POPULATE_USER)
      .populate('members.user', POPULATE_USER);

    emitProject(req.io, 'project:updated', updated);
    res.json(updated);
  } catch (err) { next(err); }
};

const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Only owner can delete
    if (project.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only the project owner can delete it' });

    await Project.findByIdAndDelete(req.params.id);
    await Task.deleteMany({ project: req.params.id });
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
};

const addMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $addToSet: { members: { user: userId, role: role || 'member' } } },
      { new: true }
    ).populate('members.user', POPULATE_USER);
    if (!project) return res.status(403).json({ message: 'Only the owner can add members' });
    res.json(project);
  } catch (err) { next(err); }
};

const getProjectStats = async (req, res, next) => {
  try {
    const projectId = new mongoose.Types.ObjectId(req.params.id);
    const now       = new Date();

    const [result] = await Task.aggregate([
      { $match: { project: projectId } },
      { $facet: {
          byStatus:  [{ $group: { _id: '$status',   count: { $sum: 1 } } }],
          byPriority:[{ $group: { _id: '$priority', count: { $sum: 1 } } }],
          overdue:   [
            { $match: { dueDate: { $lt: now }, status: { $ne: TASK_STATUS.DONE } } },
            { $count: 'count' }
          ],
          total: [{ $count: 'count' }]
      }}
    ]);

    const byStatus   = { todo: 0, inprogress: 0, review: 0, done: 0 };
    const byPriority = { urgent: 0, high: 0, medium: 0, low: 0, none: 0 };
    (result.byStatus   || []).forEach(s => { byStatus[s._id]   = s.count; });
    (result.byPriority || []).forEach(p => { byPriority[p._id] = p.count; });

    const total          = result.total[0]?.count  || 0;
    const overdue        = result.overdue[0]?.count || 0;
    const completionRate = total > 0 ? Math.round((byStatus.done / total) * 100) : 0;

    res.json({ total, byStatus, byPriority, overdue, completionRate });
  } catch (err) { next(err); }
};

module.exports = {
  getAllProjects, createProject, getProject,
  updateProject, deleteProject, addMember, getProjectStats
};
