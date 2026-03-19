import React from 'react';

export default function StatCard({ label, value, sub, icon: Icon, color = 'blue', loading }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-600',   text: 'text-blue-600' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-600',  text: 'text-green-600' },
    amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-500',  text: 'text-amber-600' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-600',    text: 'text-red-600' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-600', text: 'text-purple-600' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center flex-shrink-0 shadow-sm`}>
        {Icon && <Icon className="w-5 h-5 text-white" />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        {loading ? (
          <div className="h-7 w-16 bg-slate-100 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-slate-900 leading-none mt-1">{value ?? '—'}</p>
        )}
        {sub && <p className={`text-xs mt-1 font-medium ${c.text}`}>{sub}</p>}
      </div>
    </div>
  );
}
