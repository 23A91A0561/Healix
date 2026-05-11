import React from 'react';

export default function PageTransitionLoader({ visible, title, subtitle }) {
  if (!visible) return null;

  return (
    <div className="capsule-loader">
      <div className="capsule-loader__glow"></div>
      <div className="capsule-loader__track">
        <div className="capsule-loader__pill capsule-loader__pill--left"></div>
        <div className="capsule-loader__pill capsule-loader__pill--right"></div>
        <div className="capsule-loader__core">
          <div className="capsule-loader__dot"></div>
          <div className="capsule-loader__dot"></div>
          <div className="capsule-loader__dot"></div>
        </div>
      </div>
      {(title || subtitle) && (
        <div className="capsule-loader__text">
          {title && <div>{title}</div>}
          {subtitle && <div style={{ fontSize: '0.8em', opacity: 0.8 }}>{subtitle}</div>}
        </div>
      )}
    </div>
  );
}
