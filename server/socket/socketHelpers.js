const emitTask = (io, event, task, extraUserIds = []) => {
  const projectId = task.project?._id || task.project;
  if (projectId) io.to(`project:${projectId}`).emit(event, task);

  const assigneeIds = (task.assignees || []).map(a => (a._id || a).toString());
  const creatorId   = (task.createdBy?._id || task.createdBy)?.toString();
  const userIds     = [
    ...new Set([...assigneeIds, creatorId, ...extraUserIds.map(String)].filter(Boolean))
  ];
  userIds.forEach(uid => io.to(`user:${uid}`).emit(event, task));
};

const emitProject = (io, event, project) => {
  const projectId = project._id || project;
  io.to(`project:${projectId}`).emit(event, project);
};

module.exports = { emitTask, emitProject };
