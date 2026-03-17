import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setTaskDetailPanel } from '../../store/slices/uiSlice';
import Header from '../layout/Header';
import api from '../../utils/api';
import { priorityConfig, getDueDateLabel, getDueDateStatus } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';

export default function SearchPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        api.get('/tasks', { params: { search: query } }),
        api.get('/projects'),
      ]);

      // Defensive: handle both plain array and { tasks, pagination }
      const taskData = Array.isArray(tasksRes.data)
        ? tasksRes.data
        : (tasksRes.data?.tasks || []);

      // Filter tasks client-side by title/description since server filter is by project
      const filteredTasks = taskData.filter(t =>
        t.title?.toLowerCase().includes(query.toLowerCase()) ||
        t.description?.toLowerCase().includes(query.toLowerCase())
      );

      // projectsRes.data is always an array
      const projectData = Array.isArray(projectsRes.data) ? projectsRes.data : [];
      const filteredProjects = projectData.filter(p =>
        p.name?.toLowerCase().includes(query.toLowerCase()) ||
        p.description?.toLowerCase().includes(query.toLowerCase())
      );

      setResults({ tasks: filteredTasks, projects: filteredProjects });
    } catch (e) {
      setResults({ tasks: [], projects: [] });
    }
    setLoading(false);
  };

  return (
    <>
      <Header title="Search" />
      <div className="page-content" style={{ maxWidth: 800 }}>
        <form onSubmit={handleSearch} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="search-box" style={{ flex: 1, padding: '12px 16px', fontSize: '1rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>🔍</span>
              <input placeholder="Search tasks, projects..." value={query}
                onChange={e => setQuery(e.target.value)} autoFocus style={{ fontSize: '0.95rem' }} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {results === null && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>Search across everything</h3>
            <p>Find tasks, projects, and more by typing above</p>
          </div>
        )}

        {results && (
          <>
            {results.projects.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div className="section-header">
                  <span className="section-title">Projects ({results.projects.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {results.projects.map(p => (
                    <div key={p._id} className="card card-sm"
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                      onClick={() => navigate(`/projects/${p._id}`)}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: (p.color || '#6366f1') + '22',
                        border: `1px solid ${(p.color || '#6366f1')}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.1rem', flexShrink: 0
                      }}>
                        {p.icon || '📋'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                        {p.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.description}</div>}
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {p.totalTasks || 0} tasks
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="section-header">
                <span className="section-title">Tasks ({results.tasks.length})</span>
              </div>
              {results.tasks.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '20px 0' }}>
                  No tasks found
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {results.tasks.map(task => {
                    const pc = priorityConfig[task.priority] || priorityConfig.none;
                    const dueStatus = getDueDateStatus(task.dueDate, task.status === 'done');
                    return (
                      <div key={task._id} className="task-card"
                        onClick={() => dispatch(setTaskDetailPanel(task._id))}>
                        <div className="task-card-title">{task.title}</div>
                        <div className="task-card-meta">
                          <span className={`badge badge-${task.priority}`}>{pc.label}</span>
                          {task.dueDate && (
                            <span className={`due-date ${dueStatus}`}>📅 {getDueDateLabel(task.dueDate)}</span>
                          )}
                          {task.project && (
                            <span className="chip">{task.project.name || 'Project'}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}