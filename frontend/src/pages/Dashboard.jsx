import React, { useEffect, useState } from 'react';
import { Users, UserCheck, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { dashboardAPI } from '../services/api';

const fmtTime = (t) => (t ? t.substring(0, 5) : '—');
const fmtHrs  = (n) => `${parseFloat(n || 0).toFixed(2)} hrs`;
const fmtPHP  = (n) => `₱${parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const fmtDate = (d, fmt = 'MMM dd, yyyy') => {
  if (!d) return '—';
  try {
    const iso = d instanceof Date ? d.toISOString() : String(d);
    return format(new Date(iso.substring(0, 10) + 'T12:00:00'), fmt);
  } catch { return String(d).substring(0, 10); }
};

function getRecordBadge(rec) {
  if (rec.late_minutes > 0 && rec.overtime_minutes > 0)
    return <Badge label="Late + OT" variant="late" dot />;
  if (rec.late_minutes > 0)
    return <Badge label={`Late ${rec.late_minutes}m`} variant="late" dot />;
  if (rec.overtime_minutes > 0)
    return <Badge label={`OT ${rec.overtime_hours}h`} variant="overtime" dot />;
  if (rec.undertime_minutes > 0)
    return <Badge label="Undertime" variant="undertime" dot />;
  return <Badge label="Present" variant="present" dot />;
}

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    dashboardAPI.getStats()
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats || {};
  const records = data?.recent_records || [];
  const departments = data?.departments || [];

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Employees"
          value={stats.total_employees}
          icon={Users}
          color="blue"
          loading={loading}
        />
        <StatCard
          label="Present Today"
          value={stats.present_today}
          sub={`of ${stats.total_employees || 0} active`}
          icon={UserCheck}
          color="green"
          loading={loading}
        />
        <StatCard
          label="Late Today"
          value={stats.late_today}
          sub="employees with tardiness"
          icon={AlertTriangle}
          color="amber"
          loading={loading}
        />
        <StatCard
          label="On Overtime"
          value={stats.ot_today}
          sub={stats.total_ot_hours_today ? `${parseFloat(stats.total_ot_hours_today).toFixed(1)} total hrs` : 'today'}
          icon={TrendingUp}
          color="purple"
          loading={loading}
        />
      </div>

      {error && (
        <div className="card p-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-600 font-medium">Failed to load dashboard: {error}</p>
          <p className="text-xs text-red-400 mt-1">Make sure the backend API is running.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Records */}
        <div className="xl:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Recent DTR Records</h3>
            <p className="text-xs text-slate-400 mt-0.5">Latest 10 attendance entries</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="th">Employee</th>
                  <th className="th">Date</th>
                  <th className="th">Time In / Out</th>
                  <th className="th">Hours</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="td">
                          <div className="h-4 bg-slate-100 rounded animate-pulse w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
                {!loading && records.length === 0 && (
                  <tr>
                    <td colSpan={5} className="td text-center text-slate-400 py-10">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No attendance records yet</p>
                    </td>
                  </tr>
                )}
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="td">
                      <p className="font-medium text-slate-800">
                        {r.last_name}, {r.first_name}
                      </p>
                      <p className="text-xs text-slate-400">{r.employee_code}</p>
                    </td>
                    <td className="td whitespace-nowrap">
                      {fmtDate(r.record_date, 'MMM dd, yyyy')}
                    </td>
                    <td className="td">
                      <span className="font-mono text-xs">
                        {fmtTime(r.am_in)} – {fmtTime(r.pm_out)}
                      </span>
                    </td>
                    <td className="td font-medium">{fmtHrs(r.total_rendered_hours)}</td>
                    <td className="td">{getRecordBadge(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dept Breakdown */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Departments</h3>
            <p className="text-xs text-slate-400 mt-0.5">Active employee distribution</p>
          </div>
          <div className="p-4 space-y-3">
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 bg-slate-100 rounded animate-pulse flex-1" />
                <div className="h-4 bg-slate-100 rounded animate-pulse w-8" />
              </div>
            ))}
            {!loading && departments.map((d) => {
              const pct = stats.total_employees
                ? Math.round((d.employee_count / stats.total_employees) * 100)
                : 0;
              return (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600 truncate max-w-[70%]">{d.name}</span>
                    <span className="text-xs text-slate-400">{d.employee_count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!loading && departments.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No departments found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
