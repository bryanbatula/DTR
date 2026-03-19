import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Clock, Calculator, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { attendanceAPI, employeeAPI } from '../services/api';

// Defined outside the component so React doesn't recreate it on every render
function TimeField({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="time"
        className="input"
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

const today = () => new Date().toISOString().split('T')[0];
const fmtTime = (t) => (t ? t.substring(0, 5) : '—');
const fmtHrs  = (n) => `${parseFloat(n || 0).toFixed(2)} hrs`;
const fmtPHP  = (n) => `₱${parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

// Safely format any date value — handles pg returning DATE as a string "YYYY-MM-DD"
// or a full ISO timestamp "2026-03-19T00:00:00.000Z". Uses noon to avoid timezone shifts.
const fmtDate = (d, fmt = 'MMM dd, yyyy') => {
  if (!d) return '—';
  try {
    const iso = d instanceof Date ? d.toISOString() : String(d);
    return format(new Date(iso.substring(0, 10) + 'T12:00:00'), fmt);
  } catch {
    return String(d).substring(0, 10);
  }
};

const EMPTY_FORM = {
  employee_id: '', record_date: today(), am_in: '08:00',
  am_out: '12:00', pm_in: '13:00', pm_out: '17:00',
  day_type: 'regular', notes: '', noLunchPunch: false,
};

const DAY_TYPES = [
  { value: 'regular',          label: 'Regular Day (125% OT)' },
  { value: 'rest_day',         label: 'Rest Day (130% OT)' },
  { value: 'special_holiday',  label: 'Special Holiday (130% OT)' },
  { value: 'regular_holiday',  label: 'Regular Holiday (200% OT)' },
];

export default function Attendance() {
  const [records,     setRecords]     = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [delTarget,   setDelTarget]   = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [calc,        setCalc]        = useState(null);

  const [filters, setFilters] = useState({
    record_date: today(), employee_id: '', day_type: '',
  });

  const fetchRecords = useCallback(() => {
    setLoading(true);
    attendanceAPI.getAll(filters)
      .then((res) => setRecords(res.data))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    employeeAPI.getAll({ limit: 200, is_active: 'true' })
      .then((res) => setEmployees(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const openLog = () => { setForm(EMPTY_FORM); setCalc(null); setIsModalOpen(true); };

  const getHourlyRate = () => {
    const emp = employees.find((e) => String(e.id) === String(form.employee_id));
    return emp ? parseFloat(emp.daily_rate) / 8 : 0;
  };

  const handleCalculate = async () => {
    if (!form.am_in) { toast.error('AM IN is required.'); return; }
    setCalculating(true);
    setCalc(null);
    try {
      const payload = {
        am_in:       form.am_in,
        am_out:      form.noLunchPunch ? null : (form.am_out || null),
        pm_in:       form.noLunchPunch ? null : (form.pm_in  || null),
        pm_out:      form.pm_out || null,
        day_type:    form.day_type,
        hourly_rate: getHourlyRate(),
      };
      const res = await attendanceAPI.calculate(payload);
      setCalc(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!form.employee_id) { toast.error('Please select an employee.'); return; }
    if (!form.am_in)       { toast.error('AM IN time is required.'); return; }
    setSaving(true);
    try {
      await attendanceAPI.upsert({
        employee_id: form.employee_id,
        record_date: form.record_date,
        am_in:       form.am_in,
        am_out:      form.noLunchPunch ? null : (form.am_out || null),
        pm_in:       form.noLunchPunch ? null : (form.pm_in  || null),
        pm_out:      form.pm_out || null,
        day_type:    form.day_type,
        notes:       form.notes || null,
      });
      toast.success('DTR record saved successfully.');
      setIsModalOpen(false);
      fetchRecords();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      await attendanceAPI.remove(delTarget.id);
      toast.success('Record deleted.');
      setDelTarget(null);
      fetchRecords();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const setF = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">DTR Log</h2>
          <p className="page-subtitle">4-Punch System — Philippine Labor Code</p>
        </div>
        <button className="btn-primary" onClick={openLog}>
          <Plus className="w-4 h-4" /> Log DTR
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            className="input"
            value={filters.record_date}
            onChange={(e) => setFilters({ ...filters, record_date: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Employee</label>
          <select
            className="input"
            value={filters.employee_id}
            onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}
          >
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.last_name}, {e.first_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Day Type</label>
          <select
            className="input"
            value={filters.day_type}
            onChange={(e) => setFilters({ ...filters, day_type: e.target.value })}
          >
            <option value="">All Types</option>
            {DAY_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label.split(' (')[0]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            className="btn-secondary w-full justify-center"
            onClick={() => setFilters({ record_date: today(), employee_id: '', day_type: '' })}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="th">Employee</th>
                <th className="th">Date</th>
                <th className="th">AM In</th>
                <th className="th">AM Out</th>
                <th className="th">PM In</th>
                <th className="th">PM Out</th>
                <th className="th">Hours</th>
                <th className="th">Late</th>
                <th className="th">UT</th>
                <th className="th">OT</th>
                <th className="th">Gross Pay</th>
                <th className="th">Flags</th>
                <th className="th text-right">Del</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 13 }).map((_, j) => (
                    <td key={j} className="td">
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-12" />
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={13} className="td text-center py-16 text-slate-400">
                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-25" />
                    <p className="font-medium">No records for selected filters</p>
                  </td>
                </tr>
              )}
              {records.map((r) => {
                const gross = parseFloat(r.regular_pay || 0) + parseFloat(r.overtime_pay || 0) +
                  parseFloat(r.night_diff_pay || 0) - parseFloat(r.late_deduction || 0) -
                  parseFloat(r.undertime_deduction || 0);
                return (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                    <td className="td">
                      <p className="font-medium text-slate-800 whitespace-nowrap">
                        {r.last_name}, {r.first_name}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">{r.employee_code}</p>
                    </td>
                    <td className="td whitespace-nowrap text-sm">
                      {fmtDate(r.record_date, 'MMM dd')}
                      {r.day_type !== 'regular' && (
                        <Badge label={r.day_type.replace('_', ' ')} variant={r.day_type} />
                      )}
                    </td>
                    <td className="td font-mono text-xs">{fmtTime(r.am_in)}</td>
                    <td className="td font-mono text-xs">{fmtTime(r.am_out)}</td>
                    <td className="td font-mono text-xs">{fmtTime(r.pm_in)}</td>
                    <td className="td font-mono text-xs">{fmtTime(r.pm_out)}</td>
                    <td className="td font-semibold">{fmtHrs(r.total_rendered_hours)}</td>
                    <td className="td">
                      {r.late_minutes > 0
                        ? <span className="text-amber-600 font-medium">{r.late_minutes}m</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="td">
                      {r.undertime_minutes > 0
                        ? <span className="text-orange-600 font-medium">{r.undertime_minutes}m</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="td">
                      {r.overtime_hours > 0
                        ? <span className="text-purple-600 font-medium">{fmtHrs(r.overtime_hours)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="td font-semibold text-slate-700">{fmtPHP(gross)}</td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1">
                        {r.missed_lunch_punch && <Badge label="No Lunch" variant="absent" />}
                        {r.night_diff_hours > 0 && <Badge label="ND" variant="night-diff" />}
                      </div>
                    </td>
                    <td className="td text-right">
                      <button
                        onClick={() => setDelTarget(r)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log DTR Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Daily Time Record"
        size="xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn-secondary" onClick={handleCalculate} disabled={calculating}>
              <Calculator className="w-4 h-4" />
              {calculating ? 'Calculating…' : 'Calculate'}
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save DTR'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left — Inputs */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-1 sm:col-span-2">
                <label className="label">Employee *</label>
                <select
                  className="input"
                  value={form.employee_id}
                  onChange={(e) => setF('employee_id', e.target.value)}
                >
                  <option value="">— Select Employee —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.last_name}, {e.first_name} ({e.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Date *</label>
                <input type="date" className="input" value={form.record_date}
                  onChange={(e) => setF('record_date', e.target.value)} />
              </div>
              <div>
                <label className="label">Day Type</label>
                <select className="input" value={form.day_type}
                  onChange={(e) => setF('day_type', e.target.value)}>
                  {DAY_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4-Punch System */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">4-Punch System</p>
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={form.noLunchPunch}
                    onChange={(e) => setF('noLunchPunch', e.target.checked)}
                    className="accent-amber-500 w-3.5 h-3.5"
                  />
                  No lunch punch (auto-deduct 1hr)
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TimeField label="AM IN — Clock In *"   value={form.am_in}  onChange={(e) => setF('am_in',  e.target.value)} />
                <TimeField label="AM OUT — Lunch Start" value={form.am_out} onChange={(e) => setF('am_out', e.target.value)} disabled={form.noLunchPunch} />
                <TimeField label="PM IN — Lunch End"    value={form.pm_in}  onChange={(e) => setF('pm_in',  e.target.value)} disabled={form.noLunchPunch} />
                <TimeField label="PM OUT — Clock Out"   value={form.pm_out} onChange={(e) => setF('pm_out', e.target.value)} />
              </div>
              {/* keep 2-col for time fields — they're short enough even on phones */}
              {form.noLunchPunch && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Mandatory 1-hour lunch break will be automatically deducted per Book III, Rule IV, Sec. 4.</span>
                </div>
              )}
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea className="input resize-none" rows={2} value={form.notes}
                onChange={(e) => setF('notes', e.target.value)}
                placeholder="Optional remarks…" />
            </div>
          </div>

          {/* Right — Calculation Preview */}
          <div>
            <p className="label mb-3">Calculation Preview</p>
            {!calc && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2 py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <Calculator className="w-8 h-8 opacity-40" />
                <p>Click <strong>Calculate</strong> to preview DTR</p>
              </div>
            )}
            {calc && (
              <div className="space-y-3">
                {/* Time Metrics */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Time Summary</p>
                  {[
                    { label: 'Total Rendered', value: fmtHrs(calc.total_rendered_hours), highlight: true },
                    { label: 'Late Minutes',   value: calc.late_minutes > 0 ? `${calc.late_minutes} min` : '—', warn: calc.late_minutes > 0 },
                    { label: 'Undertime',      value: calc.undertime_minutes > 0 ? `${calc.undertime_minutes} min` : '—', warn: calc.undertime_minutes > 0 },
                    { label: 'Overtime',       value: calc.overtime_hours > 0 ? `${fmtHrs(calc.overtime_hours)} (${calc.ot_rate_label})` : '—', good: calc.overtime_hours > 0 },
                    { label: 'Night Diff',     value: calc.night_diff_hours > 0 ? fmtHrs(calc.night_diff_hours) : '—', good: calc.night_diff_hours > 0 },
                  ].map(({ label, value, highlight, warn, good }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{label}</span>
                      <span className={`font-semibold ${highlight ? 'text-slate-800' : warn ? 'text-amber-600' : good ? 'text-purple-600' : 'text-slate-400'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pay Breakdown */}
                {getHourlyRate() > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Pay Breakdown</p>
                    {[
                      { label: 'Regular Pay',          value: fmtPHP(calc.regular_pay),         color: 'text-green-700' },
                      { label: `OT Pay (${calc.ot_rate_label})`, value: calc.overtime_pay > 0 ? fmtPHP(calc.overtime_pay) : '—', color: 'text-purple-700' },
                      { label: 'Night Diff Pay (+10%)', value: calc.night_diff_pay > 0 ? fmtPHP(calc.night_diff_pay) : '—', color: 'text-indigo-700' },
                      { label: 'Late Deduction',        value: calc.late_deduction > 0 ? `−${fmtPHP(calc.late_deduction)}` : '—', color: 'text-red-600' },
                      { label: 'Undertime Deduction',   value: calc.undertime_deduction > 0 ? `−${fmtPHP(calc.undertime_deduction)}` : '—', color: 'text-red-600' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 text-xs">{label}</span>
                        <span className={`font-semibold text-xs ${color}`}>{value}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-200 pt-2 mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">Gross Pay</span>
                      <span className="text-base font-bold text-slate-900">{fmtPHP(calc.gross_pay)}</span>
                    </div>
                  </div>
                )}

                {/* Art. 88 Notice */}
                {calc.late_minutes > 0 && calc.overtime_minutes > 0 && (
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-700">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Art. 88 applied: Tardiness deduction is NOT offset by overtime worked.</span>
                  </div>
                )}
                {calc.missed_lunch_punch && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Missed lunch punch detected. 1-hour mandatory break was auto-deducted.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={!!delTarget}
        onClose={() => setDelTarget(null)}
        title="Delete Record"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDelTarget(null)}>Cancel</button>
            <button className="btn-danger" onClick={handleDelete}>Delete</button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete DTR record for <strong>{delTarget?.first_name} {delTarget?.last_name}</strong> on{' '}
          <strong>{delTarget?.record_date?.substring(0, 10)}</strong>? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
