"use client";

import React from 'react';

export default function LoadingOverlay({ show = false, text = 'Cargando…' }) {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36, border: '3px solid #93c5fd', borderTopColor: '#1d4ed8',
          borderRadius: '50%', animation: 'spin 1s linear infinite'
        }} />
        <div style={{ color: '#1f2937', fontWeight: 600 }}>{text}</div>
        <style>{`@keyframes spin { from {transform: rotate(0)} to {transform: rotate(360deg)} }`}</style>
      </div>
    </div>
  );
}
