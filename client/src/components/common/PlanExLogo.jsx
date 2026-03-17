import React from 'react';

export function PlanExIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="22" fill="#1E293B"/>
      <rect width="100" height="100" rx="22" fill="none" stroke="#6366F1" strokeWidth="3"/>
      <path
        d="M26 22 L26 78 M26 22 L50 22 Q68 22 68 40 Q68 56 50 56 L26 56"
        stroke="#6366F1"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="74" cy="74" r="10" fill="#6366F1"/>
      <path
        d="M70 74 L73 77 L79 71"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlanExLogo({ size = 36 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <PlanExIcon size={size} />
      <span style={{
        fontSize: size * 0.5,
        fontWeight: 700,
        letterSpacing: '-0.03em',
        color: 'var(--text-primary)',
        lineHeight: 1,
      }}>
        Plan<span style={{ color: '#6366F1' }}>Ex</span>
      </span>
    </div>
  );
}