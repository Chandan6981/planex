import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideToast } from '../../store/slices/uiSlice';

export default function Toast() {
  const dispatch = useDispatch();
  const { toast } = useSelector(state => state.ui);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => dispatch(hideToast()), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  if (!toast) return null;

  const colors = {
    success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: '✅' },
    error: { bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.3)', icon: '❌' },
    info: { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', icon: 'ℹ️' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '⚠️' },
  };

  const c = colors[toast.type] || colors.info;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius)',
      backdropFilter: 'blur(10px)',
      boxShadow: 'var(--shadow-lg)',
      animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      maxWidth: 320,
    }}>
      <span>{c.icon}</span>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{toast.message}</span>
      <button className="btn-icon" onClick={() => dispatch(hideToast())} style={{ marginLeft: 4, opacity: 0.7 }}>✕</button>
    </div>
  );
}
