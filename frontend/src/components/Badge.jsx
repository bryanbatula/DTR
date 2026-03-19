import React from 'react';

const VARIANTS = {
  default:          'bg-slate-100 text-slate-600',
  present:          'bg-green-100 text-green-700',
  late:             'bg-amber-100 text-amber-700',
  undertime:        'bg-orange-100 text-orange-700',
  overtime:         'bg-purple-100 text-purple-700',
  absent:           'bg-red-100 text-red-700',
  'night-diff':     'bg-indigo-100 text-indigo-700',
  regular:          'bg-slate-100 text-slate-600',
  probationary:     'bg-blue-100 text-blue-700',
  contractual:      'bg-yellow-100 text-yellow-700',
  part_time:        'bg-teal-100 text-teal-700',
  rest_day:         'bg-cyan-100 text-cyan-700',
  special_holiday:  'bg-violet-100 text-violet-700',
  regular_holiday:  'bg-rose-100 text-rose-700',
  active:           'bg-green-100 text-green-700',
  inactive:         'bg-red-100 text-red-700',
};

export default function Badge({ label, variant = 'default', dot }) {
  const cls = VARIANTS[variant] || VARIANTS.default;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current`} />}
      {label}
    </span>
  );
}
