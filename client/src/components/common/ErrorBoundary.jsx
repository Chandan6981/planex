import React from 'react';


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary] ${this.props.section || 'Unknown'} crashed:`, error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         '48px 24px',
        gap:             16,
        textAlign:       'center',
        minHeight:       200,
        background:      'var(--bg-secondary, #1e2130)',
        border:          '1px solid var(--border, #2d3148)',
        borderRadius:    12,
        margin:          16,
      }}>
        <div style={{ fontSize: '2rem' }}>⚠️</div>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary, #e2e8f0)' }}>
          Something went wrong{this.props.section ? ` in ${this.props.section}` : ''}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', maxWidth: 360 }}>
          An unexpected error occurred. The rest of the app is still working.
          {this.state.error?.message && (
            <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: '0.72rem', color: '#ef4444' }}>
              {this.state.error.message}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            onClick={this.handleReset}
            style={{
              padding:       '8px 20px',
              background:    '#6366f1',
              color:         '#fff',
              border:        'none',
              borderRadius:  8,
              cursor:        'pointer',
              fontSize:      '0.82rem',
              fontWeight:    600,
            }}>
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding:       '8px 20px',
              background:    'transparent',
              color:         'var(--text-muted, #64748b)',
              border:        '1px solid var(--border, #2d3148)',
              borderRadius:  8,
              cursor:        'pointer',
              fontSize:      '0.82rem',
            }}>
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;