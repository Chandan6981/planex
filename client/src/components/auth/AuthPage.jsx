import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, register, clearError } from '../../store/slices/authSlice';
import { PlanExIcon } from '../common/PlanExLogo';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, user } = useSelector(state => state.auth);

  useEffect(() => { if (user) navigate('/dashboard'); }, [user, navigate]);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    dispatch(clearError());
    const action = isLogin
      ? login({ email: form.email, password: form.password })
      : register(form);
    const result = await dispatch(action);
    if (!result.error) navigate('/dashboard');
  };

  const switchMode = () => { setIsLogin(!isLogin); dispatch(clearError()); };

  return (
    <div className="auth-page">
      <div className="auth-bg-grid" />
      <div className="auth-bg-glow" />
      <div className="auth-card">
        <div className="auth-logo">
          <PlanExIcon size={36} />
          <span style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
            Plan<span style={{ color: '#6366F1' }}>Ex</span>
          </span>
        </div>

        <h2 className="auth-title">{isLogin ? 'Sign in' : 'Create account'}</h2>
        <p className="auth-subtitle">
          {isLogin ? 'Enter your credentials to continue' : 'Get started with PlanEx for free'}
        </p>

        {error && <div className="error-msg" style={{ marginBottom: 14 }}>{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="input-group">
              <label className="input-label">Full name</label>
              <input className="input" type="text" name="name" placeholder="Alex Johnson"
                value={form.name} onChange={handleChange} required autoFocus />
            </div>
          )}
          <div className="input-group">
            <label className="input-label">Email address</label>
            <input className="input" type="email" name="email" placeholder="you@company.com"
              value={form.email} onChange={handleChange} required autoFocus={isLogin} />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input className="input" type="password" name="password" placeholder="••••••••"
              value={form.password} onChange={handleChange} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', padding: '8px 16px', marginTop: 4, justifyContent: 'center', fontSize: '0.85rem' }}>
            {loading
              ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Processing...</>
              : isLogin ? 'Continue' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <a onClick={switchMode}>{isLogin ? 'Sign up' : 'Sign in'}</a>
        </div>
      </div>
    </div>
  );
}