import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTask, updateTask, deleteTask, addComment } from '../../store/slices/tasksSlice';
import { setTaskDetailPanel, showToast } from '../../store/slices/uiSlice';
import { priorityConfig, getInitials, timeAgo, formatDate, getDueDateStatus, getDueDateLabel } from '../../utils/helpers';
import api from '../../utils/api';

// ── File type helpers ─────────────────────────────────────────────────────────
const isImage    = (mime) => mime?.startsWith('image/');
const fileIcon   = (mime) => {
  if (!mime) return '📄';
  if (mime.startsWith('image/'))       return '🖼️';
  if (mime === 'application/pdf')      return '📕';
  if (mime.includes('word'))           return '📘';
  if (mime.startsWith('text/'))        return '📝';
  return '📄';
};
const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024*1024)  return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MB`;
};

export default function TaskDetailPanel({ taskId }) {
  const dispatch = useDispatch();
  const { selectedTask: task, loading } = useSelector(state => state.tasks);
  const { user } = useSelector(state => state.auth);

  const [comment,      setComment]      = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal,     setTitleVal]     = useState('');
  const [newSubtask,   setNewSubtask]   = useState('');
  const [activeTab,    setActiveTab]    = useState('details');

  // Assignee picker
  const [allUsers,       setAllUsers]       = useState([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showPicker,     setShowPicker]     = useState(false);
  const pickerRef = useRef(null);

  // Attachment upload state
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState('');
  const [deletingId,   setDeletingId]   = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (taskId) dispatch(fetchTask(taskId));
  }, [taskId, dispatch]);

  useEffect(() => {
    if (task) setTitleVal(task.title);
  }, [task]);

  useEffect(() => {
    api.get('/users').then(r => setAllUsers(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
        setAssigneeSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!task || loading) return (
    <div className="task-detail-overlay" onClick={() => dispatch(setTaskDetailPanel(null))}>
      <div className="task-detail-panel" onClick={e => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    </div>
  );

  const dueStatus = getDueDateStatus(task.dueDate, task.status === 'done');
  const update    = (data) => dispatch(updateTask({ id: task._id, data }));

  const handleTitleSave = () => {
    if (titleVal.trim() && titleVal !== task.title) update({ title: titleVal });
    setEditingTitle(false);
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await dispatch(addComment({ id: task._id, data: { text: comment } }));
    setComment('');
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    update({ subtasks: [...(task.subtasks || []), { title: newSubtask, completed: false }] });
    setNewSubtask('');
  };

  const toggleSubtask = (subtaskId, completed) => {
    api.put(`/tasks/${task._id}/subtasks/${subtaskId}`, { completed: !completed });
    update({ subtasks: task.subtasks.map(s => s._id === subtaskId ? { ...s, completed: !completed } : s) });
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    await dispatch(deleteTask(task._id));
    dispatch(setTaskDetailPanel(null));
    dispatch(showToast({ message: 'Task deleted', type: 'info' }));
  };

  const toggleAssignee = (userId) => {
    const currentIds = (task.assignees || []).map(a => a._id || a);
    const alreadyIn  = currentIds.some(id => id.toString() === userId.toString());
    const newIds     = alreadyIn
      ? currentIds.filter(id => id.toString() !== userId.toString())
      : [...currentIds, userId];
    update({ assignees: newIds });
  };

  // ── Attachment handlers ───────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size check (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 10MB.');
      return;
    }

    setUploadError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.post(`/tasks/${task._id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Refresh task to get updated attachments list
      dispatch(fetchTask(task._id));
      dispatch(showToast({ message: 'File uploaded successfully', type: 'success' }));
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Reset input so same file can be re-uploaded if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Delete this attachment?')) return;
    setDeletingId(attachmentId);
    try {
      await api.delete(`/tasks/${task._id}/attachments/${attachmentId}`);
      dispatch(fetchTask(task._id));
      dispatch(showToast({ message: 'Attachment deleted', type: 'info' }));
    } catch (err) {
      dispatch(showToast({ message: 'Failed to delete attachment', type: 'error' }));
    } finally {
      setDeletingId(null);
    }
  };

  const assigneeIds    = new Set((task.assignees || []).map(a => (a._id || a).toString()));
  const filteredUsers  = allUsers.filter(u =>
    u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(assigneeSearch.toLowerCase())
  );
  const subtasksDone   = task.subtasks?.filter(s => s.completed).length || 0;
  const subtasksTotal  = task.subtasks?.length || 0;
  const attachCount    = task.attachments?.length || 0;

  // ── Tab config ────────────────────────────────────────────────────────────
  const TABS = [
    { key: 'details',     label: 'Details' },
    { key: 'attachments', label: attachCount > 0 ? `Files (${attachCount})` : 'Files' },
    { key: 'subtasks',    label: subtasksTotal > 0 ? `Subtasks (${subtasksDone}/${subtasksTotal})` : 'Subtasks' },
    { key: 'comments',    label: task.comments?.length > 0 ? `Comments (${task.comments.length})` : 'Comments' },
    { key: 'activity',    label: 'Activity' },
  ];

  return (
    <div className="task-detail-overlay" onClick={() => dispatch(setTaskDetailPanel(null))}>
      <div className="task-detail-panel" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              {editingTitle ? (
                <input className="input" value={titleVal}
                  onChange={e => setTitleVal(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
                  autoFocus style={{ fontSize: '1rem', fontWeight: 600 }} />
              ) : (
                <h3 style={{ fontSize: '1.1rem', lineHeight: 1.4, cursor: 'pointer', wordBreak: 'break-word' }}
                  onClick={() => setEditingTitle(true)} title="Click to edit">
                  {task.title}
                </h3>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button className="btn-icon" onClick={handleDelete} title="Delete task" style={{ color: 'var(--rose)' }}>🗑️</button>
              <button className="btn-icon" onClick={() => dispatch(setTaskDetailPanel(null))} title="Close">✕</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="input" style={{ width: 'auto', padding: '4px 28px 4px 8px', fontSize: '0.78rem' }}
              value={task.status} onChange={e => update({ status: e.target.value, column: e.target.value })}>
              <option value="todo">To Do</option>
              <option value="inprogress">In Progress</option>
              <option value="review">In Review</option>
              <option value="done">Done</option>
            </select>
            <select className="input" style={{ width: 'auto', padding: '4px 28px 4px 8px', fontSize: '0.78rem' }}
              value={task.priority} onChange={e => update({ priority: e.target.value })}>
              <option value="none">⚪ No Priority</option>
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="urgent">🔴 Urgent</option>
            </select>
            {task.dueDate && (
              <span className={`due-date ${dueStatus}`}>📅 {getDueDateLabel(task.dueDate)}</span>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
          <div className="tabs">
            {TABS.map(t => (
              <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>

          {/* ── DETAILS TAB ── */}
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <div>
                <div className="input-label" style={{ marginBottom: 6 }}>Description</div>
                <textarea className="input" value={task.description || ''}
                  onChange={e => update({ description: e.target.value })}
                  placeholder="Add a description..." rows={4} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div className="input-label" style={{ marginBottom: 6 }}>Due Date</div>
                  <input className="input" type="date"
                    value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                    onChange={e => update({ dueDate: e.target.value })} />
                </div>
                <div>
                  <div className="input-label" style={{ marginBottom: 6 }}>Estimated Hours</div>
                  <input className="input" type="number" value={task.estimatedHours || ''}
                    placeholder="0" min="0"
                    onChange={e => update({ estimatedHours: e.target.value })} />
                </div>
              </div>

              {/* Assignees */}
              <div>
                <div className="input-label" style={{ marginBottom: 8 }}>Assignees</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {task.assignees?.length > 0 ? task.assignees.map(a => (
                    <div key={a._id} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 6px 4px 10px',
                      background: 'var(--bg-tertiary)', borderRadius: 20,
                      fontSize: '0.8rem', border: '1px solid var(--border)',
                    }}>
                      <div className="avatar avatar-sm" style={{ background: a.color || '#6366f1' }}>
                        {getInitials(a.name)}
                      </div>
                      <span>{a.name}</span>
                      <button onClick={() => toggleAssignee(a._id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', padding: '0 2px', fontSize: '0.75rem',
                        display: 'flex', alignItems: 'center', lineHeight: 1,
                      }} title={`Remove ${a.name}`}>✕</button>
                    </div>
                  )) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No assignees</span>
                  )}
                </div>

                <div ref={pickerRef} style={{ position: 'relative' }}>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }}
                    onClick={() => setShowPicker(v => !v)}>
                    + Assign person
                  </button>
                  {showPicker && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, zIndex: 100,
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
                      width: 240, marginTop: 4,
                    }}>
                      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                        <input className="input" placeholder="Search people…"
                          value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)}
                          autoFocus style={{ fontSize: '0.78rem', padding: '5px 8px' }} />
                      </div>
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {filteredUsers.length === 0 ? (
                          <div style={{ padding: '10px 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>No users found</div>
                        ) : filteredUsers.map(u => {
                          const assigned = assigneeIds.has(u._id.toString());
                          return (
                            <div key={u._id} onClick={() => toggleAssignee(u._id)} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 12px', cursor: 'pointer',
                              background: assigned ? 'var(--accent-dim)' : 'transparent',
                            }}>
                              <div className="avatar avatar-sm" style={{ background: u.color || '#6366f1', flexShrink: 0 }}>
                                {getInitials(u.name)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                              </div>
                              {assigned && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="input-label" style={{ marginBottom: 6 }}>Tags</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {task.tags?.length > 0
                    ? task.tags.map(t => <span key={t} className="tag">{t}</span>)
                    : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No tags</span>}
                </div>
              </div>

              <div>
                <div className="input-label" style={{ marginBottom: 4 }}>Created</div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {formatDate(task.createdAt)} by {task.createdBy?.name}
                </span>
              </div>
            </div>
          )}

          {/* ── ATTACHMENTS TAB ── */}
          {activeTab === 'attachments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Upload area */}
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--border)';
                  const file = e.dataTransfer.files?.[0];
                  if (file && fileInputRef.current) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    fileInputRef.current.files = dt.files;
                    handleFileChange({ target: fileInputRef.current });
                  }
                }}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.2s',
                  opacity: uploading ? 0.6 : 1,
                }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                />
                {uploading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    <span style={{ fontSize: '0.85rem' }}>Uploading…</span>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>📎</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Click or drag file to upload
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Images, PDF, Word, text — max 10MB
                    </div>
                  </>
                )}
              </div>

              {/* Error message */}
              {uploadError && (
                <div style={{
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--rose-dim, rgba(239,68,68,0.1))',
                  border: '1px solid var(--rose)',
                  fontSize: '0.8rem', color: 'var(--rose)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>{uploadError}</span>
                  <button onClick={() => setUploadError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rose)', fontSize: '0.9rem' }}>✕</button>
                </div>
              )}

              {/* Attachment list */}
              {task.attachments?.length === 0 || !task.attachments ? (
                <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No files yet — upload one above
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {task.attachments.map(att => (
                    <div key={att._id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                    }}>
                      {/* Preview or icon */}
                      {isImage(att.mimetype) ? (
                        <img
                          src={att.url}
                          alt={att.originalName}
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: 6, flexShrink: 0,
                          background: 'var(--bg-secondary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.3rem',
                        }}>
                          {fileIcon(att.mimetype)}
                        </div>
                      )}

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.originalName}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatSize(att.size)}
                          {att.uploadedAt && ` · ${timeAgo(att.uploadedAt)}`}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.originalName}
                          onClick={e => e.stopPropagation()}
                          style={{
                            padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                            fontSize: '0.72rem', color: 'var(--text-secondary)',
                            textDecoration: 'none', cursor: 'pointer',
                          }}>
                          {isImage(att.mimetype) ? 'View' : 'Download'}
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(att._id)}
                          disabled={deletingId === att._id}
                          style={{
                            padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                            background: 'none', border: '1px solid var(--border)',
                            fontSize: '0.72rem', color: 'var(--rose)',
                            cursor: deletingId === att._id ? 'not-allowed' : 'pointer',
                            opacity: deletingId === att._id ? 0.5 : 1,
                          }}>
                          {deletingId === att._id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SUBTASKS TAB ── */}
          {activeTab === 'subtasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {subtasksTotal > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div className="progress-bar" style={{ height: 6 }}>
                    <div className="progress-fill" style={{ width: `${(subtasksDone / subtasksTotal) * 100}%`, background: 'var(--emerald)' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    {subtasksDone} of {subtasksTotal} completed
                  </span>
                </div>
              )}
              {task.subtasks?.map(s => (
                <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                  <div className={`checkbox ${s.completed ? 'checked' : ''}`} onClick={() => toggleSubtask(s._id, s.completed)}>
                    {s.completed && <span style={{ color: '#fff', fontSize: '0.6rem' }}>✓</span>}
                  </div>
                  <span style={{ flex: 1, fontSize: '0.875rem', textDecoration: s.completed ? 'line-through' : 'none', color: s.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {s.title}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input className="input" placeholder="Add subtask..." value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSubtask()} />
                <button className="btn btn-secondary btn-sm" onClick={addSubtask} type="button">Add</button>
              </div>
            </div>
          )}

          {/* ── COMMENTS TAB ── */}
          {activeTab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {task.comments?.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No comments yet. Be the first to comment!
                </div>
              )}
              {task.comments?.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div className="avatar avatar-sm" style={{ background: c.author?.color || '#6366f1', flexShrink: 0, marginTop: 2 }}>
                    {getInitials(c.author?.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{c.author?.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{timeAgo(c.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      {c.text}
                    </div>
                  </div>
                </div>
              ))}
              <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <div className="avatar avatar-sm" style={{ background: user?.color || '#6366f1', flexShrink: 0, marginTop: 2 }}>
                  {getInitials(user?.name)}
                </div>
                <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                  <textarea className="input" placeholder="Write a comment..." value={comment}
                    onChange={e => setComment(e.target.value)} rows={2} style={{ resize: 'none' }} />
                  <button className="btn btn-primary btn-sm" type="submit" disabled={!comment.trim()} style={{ alignSelf: 'flex-end', flexShrink: 0 }}>
                    Send
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── ACTIVITY TAB ── */}
          {activeTab === 'activity' && (
            <div>
              {!task.activityLog?.length ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No activity yet</p>
              ) : (
                task.activityLog.slice().reverse().map((log, i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-line">
                      <div className="activity-dot" style={{ background: 'var(--accent)' }} />
                      {i < task.activityLog.length - 1 && <div className="activity-connector" />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 12 }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{log.user?.name || 'Someone'}</strong>
                        {' '}{log.action === 'uploaded' ? 'uploaded' : 'changed'} <strong>{log.field}</strong>
                        {log.action !== 'uploaded' && (
                          <> from{' '}
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--rose)' }}>{log.oldValue || 'empty'}</span>
                            {' '}to{' '}
                            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--emerald)' }}>{log.newValue}</span>
                          </>
                        )}
                        {log.action === 'uploaded' && (
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--emerald)' }}> {log.newValue}</span>
                        )}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{timeAgo(log.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}