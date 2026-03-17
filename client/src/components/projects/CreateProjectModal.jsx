import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { createProject } from '../../store/slices/projectsSlice';
import { setCreateProjectModal, showToast } from '../../store/slices/uiSlice';
import { PROJECT_COLORS, PROJECT_ICONS } from '../../utils/helpers';

export default function CreateProjectModal() {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1', icon: '📋', isPrivate: false });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await dispatch(createProject(form)).unwrap();
      dispatch(setCreateProjectModal(false));
      dispatch(showToast({ message: 'Project created successfully!', type: 'success' }));
    } catch (err) {
      dispatch(showToast({ message: err || 'Failed to create project', type: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => dispatch(setCreateProjectModal(false))}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Project</h3>
          <button className="btn-icon" onClick={() => dispatch(setCreateProjectModal(false))}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: form.color + '22', border: `2px solid ${form.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                {form.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: form.color }}>
                  {form.name || 'Project Name'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{form.description || 'Project description'}</div>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Project Name *</label>
              <input className="input" type="text" placeholder="e.g. Website Redesign" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
            </div>

            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea className="input" placeholder="What is this project about?" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Color</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {PROJECT_COLORS.map(c => (
                    <div key={c} className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                      style={{ background: c }} onClick={() => setForm(p => ({ ...p, color: c }))} />
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {PROJECT_ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm(p => ({ ...p, icon }))}
                      style={{
                        padding: '4px 6px', borderRadius: 6, border: `2px solid ${form.icon === icon ? form.color : 'var(--border)'}`,
                        background: form.icon === icon ? form.color + '22' : 'var(--bg-tertiary)',
                        cursor: 'pointer', fontSize: '1rem', transition: 'var(--transition)'
                      }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.isPrivate} onChange={e => setForm(p => ({ ...p, isPrivate: e.target.checked }))} />
              Private project (only visible to members)
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => dispatch(setCreateProjectModal(false))}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.name.trim()}>
              {loading ? 'Creating...' : '🚀 Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
