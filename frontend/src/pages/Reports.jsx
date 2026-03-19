import React, { useEffect, useState, useCallback } from 'react';
import { Download, FileBarChart2, TrendingUp, Clock, Moon } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { attendanceAPI, employeeAPI } from '../services/api';

const fmtTime = (t) => (t ? t.substring(0, 5) : '—');
const fmtHrs  = (n) => `${parseFloat(n || 0).toFixed(2)}`;
const fmtPHP  = (n) => `₱${parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
const fmtDate = (d, fmt = 'MMM dd, yyyy') => {
  if (!d) return '—';
  try {
    const iso = d instanceof Date ? d.toISOString() : String(d);
    return format(new Date(iso.substring(0, 10) + 'T12:00:00'), fmt);
  } catch { return String(d).substring(0, 10); }
};

const startOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const todayStr = () => new Date().toISOString().split('T')[0];

export default function Reports() {
  const [records,   setRecords]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filters,   setFilters]   = useState({
    date_from: startOfMonth(), date_to: todayStr(), employee_id: '',
  });

  const fetchData = useCallback(() => {
    setLoading(true);
    attendanceAPI.getAll({ ...filters, limit: 500 })
      .then((res) => setRecords(res.data))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    employeeAPI.getAll({ limit: 200, is_active: 'true' })
      .then((res) => setEmployees(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Aggregated totals
  const totals = records.reduce(
    (acc, r) => ({
      hours:      acc.hours      + parseFloat(r.total_rendered_hours || 0),
      ot:         acc.ot         + parseFloat(r.overtime_hours       || 0),
      nightDiff:  acc.nightDiff  + parseFloat(r.night_diff_hours     || 0),
      lateMin:    acc.lateMin    + parseInt(r.late_minutes           || 0),
      grossPay:   acc.grossPay   + parseFloat(r.regular_pay || 0) + parseFloat(r.overtime_pay || 0) +
                                   parseFloat(r.night_diff_pay || 0) - parseFloat(r.late_deduction || 0) -
                                   parseFloat(r.undertime_deduction || 0),
    }),
    { hours: 0, ot: 0, nightDiff: 0, lateMin: 0, grossPay: 0 }
  );

  const exportCSV = () => {
    if (!records.length) { toast.error('No data to export.'); return; }
    const headers = [
      'Employee Code', 'Last Name', 'First Name', 'Date', 'Day Type',
      'AM In', 'AM Out', 'PM In', 'PM Out',
      'Total Hours', 'Late (min)', 'Undertime (min)', 'OT Hours', 'Night Diff (hrs)',
      'Regular Pay', 'OT Pay', 'Night Diff Pay', 'Late Deduction', 'UT Deduction', 'Gross Pay',
      'Missed Lunch', 'Notes',
    ];
    const rows = records.map((r) => [
      r.employee_code,
      `"${r.last_name}"`,
      `"${r.first_name}"`,
      r.record_date?.substring(0, 10),
      r.day_type,
      fmtTime(r.am_in),
      fmtTime(r.am_out),
      fmtTime(r.pm_in),
      fmtTime(r.pm_out),
      parseFloat(r.total_rendered_hours || 0).toFixed(4),
      r.late_minutes || 0,
      r.undertime_minutes || 0,
      parseFloat(r.overtime_hours || 0).toFixed(4),
      parseFloat(r.night_diff_hours || 0).toFixed(4),
      parseFloat(r.regular_pay || 0).toFixed(2),
      parseFloat(r.overtime_pay || 0).toFixed(2),
      parseFloat(r.night_diff_pay || 0).toFixed(2),
      parseFloat(r.late_deduction || 0).toFixed(2),
      parseFloat(r.undertime_deduction || 0).toFixed(2),
      (parseFloat(r.regular_pay || 0) + parseFloat(r.overtime_pay || 0) + parseFloat(r.night_diff_pay || 0)
        - parseFloat(r.late_deduction || 0) - parseFloat(r.undertime_deduction || 0)).toFixed(2),
      r.missed_lunch_punch ? 'Yes' : 'No',
      `"${r.notes || ''}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dtr-report-${filters.date_from}-to-${filters.date_to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${records.length} records to CSV.`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Payroll Report</h2>
          <p className="page-subtitle">{records.length} records in selected period</p>
        </div>
        <button className="btn-primary" onClick={exportCSV}>
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="label">Date From</label>
          <input type="date" className="input" value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
        </div>
        <div>
          <label className="label">Date To</label>
          <input type="date" className="input" value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
        </div>
        <div>
          <label className="label">Employee</label>
          <select className="input" value={filters.employee_id}
            onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}>
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.last_name}, {e.first_name}</option>
            ))}
          </select>
        </div>
        <button className="btn-secondary justify-center"
          onClick={() => setFilters({ date_from: startOfMonth(), date_to: todayStr(), employee_id: '' })}>
          Reset
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Hours Rendered" value={`${fmtHrs(totals.hours)} hrs`} icon={Clock}  color="blue"   loading={loading} />
        <StatCard label="Overtime Hours"        value={`${fmtHrs(totals.ot)} hrs`}    icon={TrendingUp} color="purple" loading={loading} />
        <StatCard label="Night Diff Hours"      value={`${fmtHrs(totals.nightDiff)} hrs`} icon={Moon} color="blue" loading={loading} />
        <StatCard label="Total Gross Pay"       value={fmtPHP(totals.grossPay)}        icon={FileBarChart2} color="green" loading={loading} />
      </div>

      {/* Detailed Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="th">Employee</th>
                <th className="th">Date</th>
                <th className="th">Day Type</th>
                <th className="th">In — Out</th>
                <th className="th">Hours</th>
                <th className="th">Late</th>
                <th className="th">UT</th>
                <th className="th">OT</th>
                <th className="th">ND</th>
                <th className="th">Regular Pay</th>
                <th className="th">OT Pay</th>
                <th className="th">ND Pay</th>
                <th className="th">Deductions</th>
                <th className="th font-bold">Gross Pay</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 14 }).map((_, j) => (
                    <td key={j} className="td">
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-14" />
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={14} className="td text-center py-16 text-slate-400">
                    <FileBarChart2 className="w-10 h-10 mx-auto mb-2 opacity-25" />
                    <p className="font-medium">No records found for the selected period</p>
                  </td>
                </tr>
              )}
              {records.map((r) => {
                const deductions = parseFloat(r.late_deduction || 0) + parseFloat(r.undertime_deduction || 0);
                const gross = parseFloat(r.regular_pay || 0) + parseFloat(r.overtime_pay || 0) +
                  parseFloat(r.night_diff_pay || 0) - deductions;
                return (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="td">
                      <p className="font-medium text-slate-800 whitespace-nowrap text-xs">
                        {r.last_name}, {r.first_name}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">{r.employee_code}</p>
                    </td>
                    <td className="td text-xs whitespace-nowrap">
                      {fmtDate(r.record_date, 'MMM dd, yyyy')}
                    </td>
                    <td className="td">
                      {r.day_type !== 'regular'
                        ? <Badge label={r.day_type.replace(/_/g, ' ')} variant={r.day_type} />
                        : <span className="text-slate-400 text-xs">Regular</span>}
                    </td>
                    <td className="td font-mono text-xs whitespace-nowrap">
                      {fmtTime(r.am_in)} — {fmtTime(r.pm_out)}
                    </td>
                    <td className="td text-xs font-semibold">{fmtHrs(r.total_rendered_hours)}</td>
                    <td className="td text-xs">
                      {r.late_minutes > 0
                        ? <span className="text-amber-600 font-medium">{r.late_minutes}m</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="td text-xs">
                      {r.undertime_minutes > 0
                        ? <span className="text-orange-600 font-medium">{r.undertime_minutes}m</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="td text-xs">
                      {parseFloat(r.overtime_hours) > 0
                        ? <span className="text-purple-600 font-medium">{fmtHrs(r.overtime_hours)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="td text-xs">
                      {parseFloat(r.night_diff_hours) > 0
                        ? <span className="text-indigo-600 font-medium">{fmtHrs(r.night_diff_hours)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="td text-xs text-green-700 font-medium">{fmtPHP(r.regular_pay)}</td>
                    <td className="td text-xs text-purple-700 font-medium">
                      {parseFloat(r.overtime_pay) > 0 ? fmtPHP(r.overtime_pay) : '—'}
                    </td>
                    <td className="td text-xs text-indigo-700 font-medium">
                      {parseFloat(r.night_diff_pay) > 0 ? fmtPHP(r.night_diff_pay) : '—'}
                    </td>
                    <td className="td text-xs text-red-600 font-medium">
                      {deductions > 0 ? `−${fmtPHP(deductions)}` : '—'}
                    </td>
                    <td className="td text-sm font-bold text-slate-900 whitespace-nowrap">
                      {fmtPHP(gross)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals Row */}
            {!loading && records.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={4} className="td font-bold text-slate-600">
                    Totals — {records.length} records
                  </td>
                  <td className="td text-xs font-bold text-slate-800">{fmtHrs(totals.hours)}</td>
                  <td className="td text-xs font-bold text-amber-600">{totals.lateMin}m</td>
                  <td className="td" />
                  <td className="td text-xs font-bold text-purple-700">{fmtHrs(totals.ot)}</td>
                  <td className="td text-xs font-bold text-indigo-700">{fmtHrs(totals.nightDiff)}</td>
                  <td className="td" />
                  <td className="td" />
                  <td className="td" />
                  <td className="td" />
                  <td className="td text-sm font-bold text-slate-900">{fmtPHP(totals.grossPay)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
