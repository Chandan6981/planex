import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks, setFilter, clearTasks } from '../../store/slices/tasksSlice';
import { setViewMode, setCreateTaskModal } from '../../store/slices/uiSlice';
import Header from '../layout/Header';
import KanbanBoard from '../tasks/KanbanBoard';
import TaskList from '../tasks/TaskList';
import api from '../../utils/api';

export default function ProjectPage() {
  const { id }     = useParams();
  const dispatch   = useDispatch();
  const { list: tasks, filter } = useSelector(state => state.tasks);
  const { viewMode }            = useSelector(state => state.ui);
  const { list: projects }      = useSelector(state => state.projects);
  const [project, setProject]   = useState(null);
  const [search,  setSearch]    = useState('');

  const proj = projects.find(p => p._id === id);

  useEffect(() => {
    if (id) {
      dispatch(fetchTasks({ project: id }));
      api.get(`/projects/${id}`).then(res => setProject(res.data));
    }
    return () => { dispatch(clearTasks()); };
  }, [id, dispatch]);

  const currentProject = project || proj;

  const filteredTasks = tasks.filter(t => {
    if (filter.priority !== 'all' && t.priority !== filter.priority) return false;
    if (filter.status   !== 'all' && t.status   !== filter.status)   return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Compute stats live from Redux — updates instantly on drag/drop ──────────
  const now = new Date();
  const stats = {
    total:      tasks.length,
    byStatus: {
      todo:       tasks.filter(t => t.status === 'todo').length,
      inprogress: tasks.filter(t => t.status === 'inprogress').length,
      review:     tasks.filter(t => t.status === 'review').length,
      done:       tasks.filter(t => t.status === 'done').length,
    },
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length,
  };
  const completionRate = tasks.length > 0
    ? Math.round((stats.byStatus.done / tasks.length) * 100)
    : 0;

  return (
    <>
      <Header
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {currentProject?.icon && <span>{currentProject.icon}</span>}
            <span>{currentProject?.name || 'Project'}</span>
            {tasks.length > 0 && (
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                {stats.byStatus.done}/{stats.total} done
              </span>
            )}
          </div>
        }
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="tabs">
              <button className={`tab ${viewMode === 'board' ? 'active' : ''}`} onClick={() => dispatch(setViewMode('board'))}>🗂 Board</button>
              <button className={`tab ${viewMode === 'list'  ? 'active' : ''}`} onClick={() => dispatch(setViewMode('list'))}>📋 List</button>
            </div>
          </div>
        }
      />

      <div className="page-content">

        {/* ── Stats Bar — reactive, no API call needed ── */}
        {tasks.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Total',       value: stats.total,              color: 'var(--text-secondary)' },
              { label: 'To Do',       value: stats.byStatus.todo,       color: '#64748b' },
              { label: 'In Progress', value: stats.byStatus.inprogress, color: '#f59e0b' },
              { label: 'In Review',   value: stats.byStatus.review,     color: '#8b5cf6' },
              { label: 'Done',        value: stats.byStatus.done,       color: '#10b981' },
              { label: 'Overdue',     value: stats.overdue,             color: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-tertiary)', borderRadius: 20 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--mono)', color: s.color }}>{s.value}</span>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 120 }}>
                <div className="progress-bar" style={{ height: 6 }}>
                  <div className="progress-fill" style={{
                    width: `${completionRate}%`,
                    background: currentProject?.color || 'var(--accent)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: currentProject?.color || 'var(--accent)', fontFamily: 'var(--mono)' }}>
                {completionRate}%
              </span>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ minWidth: 220 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>🔍</span>
            <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <select className="input" style={{ width: 'auto', padding: '7px 28px 7px 10px' }}
            value={filter.priority} onChange={e => dispatch(setFilter({ priority: e.target.value }))}>
            <option value="all">All Priorities</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>

          <select className="input" style={{ width: 'auto', padding: '7px 28px 7px 10px' }}
            value={filter.status} onChange={e => dispatch(setFilter({ status: e.target.value }))}>
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="review">In Review</option>
            <option value="done">Done</option>
          </select>

          <button className="btn btn-primary btn-sm" onClick={() => dispatch(setCreateTaskModal({ project: id }))}>
            ＋ Add Task
          </button>
        </div>

        {/* ── View ── */}
        {viewMode === 'board'
          ? <KanbanBoard tasks={filteredTasks} project={currentProject} />
          : <TaskList    tasks={filteredTasks} />
        }
      </div>
    </>
  );
}