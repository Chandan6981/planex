import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from '../layout/Header';
import { setCreateTaskModal, setTaskDetailPanel } from '../../store/slices/uiSlice';
import { updateTask } from '../../store/slices/tasksSlice';
import api from '../../utils/api';
import { getDueDateLabel, getDueDateStatus, priorityConfig, getInitials } from '../../utils/helpers';
import { getSocket } from '../../utils/socket';

export default function MyTasks() {
  const dispatch  = useDispatch();
  const { user }  = useSelector(s => s.auth);

  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('all');
  const [search,  setSearch]  = useState('');

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    api.get('/tasks', { params: { myTasks: true } })
      .then(r => {
        // Defensive: handle both plain array and { tasks, pagination }
        const data = Array.isArray(r.data) ? r.data : (r.data?.tasks || []);
        setTasks(data);
        setLoading(false);
      })
      .catch(() => { setTasks([]); setLoading(false); });
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const uid = user?._id?.toString();
  const isMine = useCallback((task) => {
    if (!uid) return false;
    const inAssignees = (task.assignees || []).some(a => (a._id || a).toString() === uid);
    const isCreator   = (task.createdBy?._id || task.createdBy)?.toString() === uid;
    return inAssignees || isCreator;
  }, [uid]);

  const isMineRef = useRef(isMine);
  useEffect(() => { isMineRef.current = isMine; }, [isMine]);

  useEffect(() => {
    if (!user) return;

    const onCreated = (task) => {
      if (!isMineRef.current(task)) return;
      setTasks(prev =>
        prev.some(t => t._id === task._id) ? prev : [task, ...prev]
      );
    };

    const onUpdated = (task) => {
      const mine = isMineRef.current(task);
      setTasks(prev => {
        if (!Array.isArray(prev)) return prev;
        const exists = prev.some(t => t._id === task._id);
        if (mine && exists)  return prev.map(t => t._id === task._id ? task : t);
        if (mine && !exists) return [task, ...prev];
        return prev.filter(t => t._id !== task._id);
      });
    };

    const onDeleted = (id) => setTasks(prev => Array.isArray(prev) ? prev.filter(t => t._id !== id) : []);

    const attach = () => {
      const socket = getSocket();
      if (!socket) return;
      socket.off('task:created', onCreated);
      socket.off('task:updated', onUpdated);
      socket.off('task:deleted', onDeleted);
      socket.on ('task:created', onCreated);
      socket.on ('task:updated', onUpdated);
      socket.on ('task:deleted', onDeleted);
    };

    attach();
    const socket = getSocket();
    if (socket) socket.on('connect', attach);

    return () => {
      const s = getSocket();
      if (!s) return;
      s.off('task:created', onCreated);
      s.off('task:updated', onUpdated);
      s.off('task:deleted', onDeleted);
      s.off('connect', attach);
    };
  }, [user]);

  const toggleDone = (e, task) => {
    e.stopPropagation();
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    setTasks(prev => Array.isArray(prev) ? prev.map(t =>
      t._id === task._id ? { ...t, status: newStatus, column: newStatus } : t
    ) : prev);
    dispatch(updateTask({ id: task._id, data: { status: newStatus, column: newStatus } }));
  };

  const today    = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const q = search.toLowerCase();
  const filtered = q ? safeTasks.filter(t => t.title?.toLowerCase().includes(q)) : safeTasks;

  const sections = {
    all:       filtered.filter(t => t.status !== 'done'),
    inbox:     filtered.filter(t => !t.project && t.status !== 'done'),
    today:     filtered.filter(t => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) < tomorrow && t.status !== 'done'),
    upcoming:  filtered.filter(t => t.dueDate && new Date(t.dueDate) >= tomorrow && new Date(t.dueDate) < nextWeek && t.status !== 'done'),
    overdue:   filtered.filter(t => t.dueDate && new Date(t.dueDate) < today && t.status !== 'done'),
    completed: filtered.filter(t => t.status === 'done'),
  };

  const tabs = [
    { key: 'all',       label: 'All Active' },
    { key: 'inbox',     label: 'Inbox' },
    { key: 'today',     label: 'Today' },
    { key: 'upcoming',  label: 'This Week' },
    { key: 'overdue',   label: 'Overdue',  warn: true },
    { key: 'completed', label: 'Completed' },
  ];

  const current = sections[section] || [];

  const STATUS_LABEL = { todo: 'To Do', inprogress: 'In Progress', review: 'In Review', done: 'Done' };
  const STATUS_COLOR = { todo: 'var(--text-muted)', inprogress: 'var(--yellow)', review: 'var(--purple)', done: 'var(--green)' };

  return (
    <>
      <Header
        title="My Tasks"
        actions={
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refresh
          </button>
        }
      />

      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="tabs">
            {tabs.map(t => {
              const count = sections[t.key]?.length || 0;
              return (
                <button key={t.key}
                  className={`tab ${section === t.key ? 'active' : ''}`}
                  onClick={() => setSection(t.key)}
                  style={t.warn && count > 0 && section !== t.key ? { color: 'var(--red)' } : {}}>
                  {t.label}
                  {count > 0 && (
                    <span style={{ marginLeft: 5, fontSize: '0.65rem', background: 'var(--bg-active)', padding: '1px 6px', borderRadius: 10, fontFamily: 'var(--mono)' }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="search-box" style={{ marginLeft: 'auto', width: 220 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input placeholder="Filter tasks…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 10, color: 'var(--text-muted)' }}>
            <div className="spinner" /> Loading…
          </div>

        ) : current.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ fontSize: '1.6rem' }}>
              {section === 'completed' ? '🎉' : section === 'inbox' ? '📥' : section === 'overdue' ? '✅' : '📋'}
            </div>
            <h3 style={{ fontSize: '0.88rem' }}>
              {section === 'completed' ? 'No completed tasks' :
               section === 'inbox'     ? 'Inbox is empty' :
               section === 'overdue'   ? 'No overdue tasks' :
               section === 'today'     ? 'Nothing due today' : 'No tasks'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {section === 'inbox' ? 'Tasks without a project appear here' :
               section === 'all'   ? 'Tasks you create or are assigned to will appear here' : ''}
            </p>
            {(section === 'all' || section === 'inbox') && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}
                onClick={() => dispatch(setCreateTaskModal(true))}>
                + New Task
              </button>
            )}
          </div>

        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="task-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Task</th>
                  <th style={{ width: 100 }}>Priority</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 130 }}>Project</th>
                  <th style={{ width: 110 }}>Due Date</th>
                  <th style={{ width: 90 }}>Assignees</th>
                </tr>
              </thead>
              <tbody>
                {current.map(task => {
                  const dueStatus = getDueDateStatus(task.dueDate, task.status === 'done');
                  const pc   = priorityConfig[task.priority] || priorityConfig.none;
                  const done = task.status === 'done';

                  return (
                    <tr key={task._id} onClick={() => dispatch(setTaskDetailPanel(task._id))}>
                      <td style={{ width: 36 }}>
                        <div onClick={e => toggleDone(e, task)} style={{
                          width: 16, height: 16, borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                          border:      done ? 'none' : '1.5px solid var(--border-strong)',
                          background:  done ? 'var(--green)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'var(--transition)',
                        }}>
                          {done && (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.82rem', fontWeight: 500,
                          color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: done ? 'line-through' : 'none',
                        }}>
                          {task.title}
                        </span>
                        {task.subtasks?.length > 0 && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
                          </div>
                        )}
                      </td>
                      <td><span className={`badge badge-${task.priority}`}>{pc.label}</span></td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: STATUS_COLOR[task.status] || 'var(--text-muted)' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[task.status] || 'var(--text-muted)', flexShrink: 0 }} />
                          {STATUS_LABEL[task.status] || 'To Do'}
                        </span>
                      </td>
                      <td>
                        {task.project
                          ? <span className="chip">
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: task.project.color || 'var(--accent)' }} />
                              {task.project.name}
                            </span>
                          : <span className="chip" style={{ color: 'var(--text-muted)' }}>📥 Inbox</span>
                        }
                      </td>
                      <td>
                        {task.dueDate
                          ? <span className={`due-date ${dueStatus}`} style={{ fontSize: '0.7rem' }}>{getDueDateLabel(task.dueDate)}</span>
                          : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                        }
                      </td>
                      <td>
                        {task.assignees?.length > 0
                          ? <div className="avatar-stack">
                              {task.assignees.slice(0, 3).map(a => (
                                <div key={a._id} className="avatar avatar-xs"
                                  style={{ background: a.color || 'var(--accent)' }} title={a.name}>
                                  {getInitials(a.name)}
                                </div>
                              ))}
                            </div>
                          : <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}