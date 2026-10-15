import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'rgb(15 23 42)' }}>
      <div className="text-center fade-in">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: 'rgb(59 130 246)', borderRightColor: 'rgb(59 130 246 / 0.3)' }}
          />
          <div
            className="absolute inset-2 rounded-full"
            style={{ background: 'linear-gradient(135deg, rgb(59 130 246 / 0.2), rgb(20 184 166 / 0.2))' }}
          />
        </div>
        <p className="text-sm" style={{ color: 'rgb(148 163 184)' }}>Loading CampusHire…</p>
      </div>
    </div>
  );
}
