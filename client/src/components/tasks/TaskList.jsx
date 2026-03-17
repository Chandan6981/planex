import React from 'react';
import { useDispatch } from 'react-redux';
import { setTaskDetailPanel } from '../../store/slices/uiSlice';
import { updateTask, deleteTask } from '../../store/slices/tasksSlice';
import { getDueDateLabel, getDueDateStatus, priorityConfig, statusConfig, getInitials, formatDate } from '../../utils/helpers';

export default function TaskList({ tasks }) {
  const dispatch = useDispatch();

  const toggleDone = (e, task) => {
    e.stopPropagation();
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    dispatch(updateTask({ id: task._id, data: { status: newStatus, column: newStatus } }));
  };

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <h3>No tasks yet</h3>
        <p>Create your first task to get started</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="task-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}></th>
            <th>Task</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assignee</th>
            <th>Due Date</th>
            <th>Tags</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => {
            const dueStatus = getDueDateStatus(task.dueDate, task.status === 'done');
            const pc = priorityConfig[task.priority] || priorityConfig.none;
            const sc = statusConfig[task.status] || statusConfig.todo;
            return (
              <tr key={task._id} onClick={() => dispatch(setTaskDetailPanel(task._id))}>
                <td style={{ width: 32 }}>
                  <div
                    className={`checkbox ${task.status === 'done' ? 'checked' : ''}`}
                    onClick={(e) => toggleDone(e, task)}
                  >
                    {task.status === 'done' && <span style={{ color: '#fff', fontSize: '0.6rem' }}>✓</span>}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                      maxWidth: 340,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>{task.title}</span>
                    {task.subtasks?.length > 0 && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge badge-${task.priority}`}>{pc.icon} {pc.label}</span>
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: sc.color }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.color }} />
                    {sc.label}
                  </span>
                </td>
                <td>
                  {task.assignees?.length > 0 ? (
                    <div className="avatar-stack">
                      {task.assignees.slice(0, 2).map(a => (
                        <div key={a._id} className="avatar avatar-sm" style={{ background: a.color || '#6366f1' }} title={a.name}>
                          {getInitials(a.name)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unassigned</span>
                  )}
                </td>
                <td>
                  {task.dueDate ? (
                    <span className={`due-date ${dueStatus}`} style={{ fontSize: '0.72rem' }}>
                      {getDueDateLabel(task.dueDate, task.status === 'done')}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>
                <td>
                  {task.tags?.slice(0, 2).map(t => <span key={t} className="tag" style={{ marginRight: 3 }}>{t}</span>)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
