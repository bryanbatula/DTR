import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { employeeAPI } from '../services/api';

const EMPTY_FORM = {
  employee_code: '', first_name: '', last_name: '', middle_name: '',
  department_id: '', position: '', date_hired: '', employment_status: 'regular',
  daily_rate: '', schedule_in: '08:00', schedule_out: '17:00', is_active: true,
};

const fmtPHP = (n) =>
  `₱${parseFloat(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

// Defined outside the component so React doesn't recreate it on every render
function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export default function Employees() {
  const [employees,    setEmployees]    = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [isModalOpen,  setIsModalOpen]  = useState(false);
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchEmployees = useCallback(() => {
    setLoading(true);
    employeeAPI.getAll({ search })
      .then((res) => setEmployees(res.data))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    employeeAPI.getDepartments()
      .then((res) => setDepartments(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(t);
  }, [fetchEmployees]);

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setIsModalOpen(true); };
  const openEdit = (emp) => {
    setEditing(emp);
    setForm({
      employee_code:      emp.employee_code,
      first_name:         emp.first_name,
      last_name:          emp.last_name,
      middle_name:        emp.middle_name || '',
      department_id:      emp.department_id || '',
      position:           emp.position || '',
      date_hired:         emp.date_hired ? emp.date_hired.substring(0, 10) : '',
      employment_status:  emp.employment_status,
      daily_rate:         emp.daily_rate,
      schedule_in:        emp.schedule_in ? emp.schedule_in.substring(0, 5) : '08:00',
      schedule_out:       emp.schedule_out ? emp.schedule_out.substring(0, 5) : '17:00',
      is_active:          emp.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.employee_code || !form.first_name || !form.last_name) {
      toast.error('Employee code, first name, and last name are required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await employeeAPI.update(editing.id, form);
        toast.success('Employee updated successfully.');
      } else {
        await employeeAPI.create(form);
        toast.success('Employee added successfully.');
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await employeeAPI.remove(deleteTarget.id);
      toast.success(`${deleteTarget.first_name} ${deleteTarget.last_name} removed.`);
      setDeleteTarget(null);
      fetchEmployees();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Employee Directory</h2>
          <p className="page-subtitle">{employees.length} records found</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Search */}
      <div className="card p-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or employee code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="th">Employee</th>
                <th className="th">Department</th>
                <th className="th">Position</th>
                <th className="th">Status</th>
                <th className="th">Daily Rate</th>
                <th className="th">Hired</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="td">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && employees.length === 0 && (
                <tr>
                  <td colSpan={7} className="td text-center py-16 text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-25" />
                    <p className="font-medium">No employees found</p>
                    <p className="text-xs mt-1">Add your first employee to get started.</p>
                  </td>
                </tr>
              )}
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                  <td className="td">
                    <p className="font-semibold text-slate-800">
                      {emp.last_name}, {emp.first_name}
                      {emp.middle_name ? ` ${emp.middle_name.charAt(0)}.` : ''}
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{emp.employee_code}</p>
                  </td>
                  <td className="td text-slate-500">{emp.department_name || '—'}</td>
                  <td className="td text-slate-500">{emp.position || '—'}</td>
                  <td className="td">
                    <Badge
                      label={emp.employment_status}
                      variant={emp.employment_status}
                      dot
                    />
                  </td>
                  <td className="td font-medium text-slate-700">{fmtPHP(emp.daily_rate)}</td>
                  <td className="td text-slate-500 whitespace-nowrap">
                    {emp.date_hired ? emp.date_hired.substring(0, 10) : '—'}
                  </td>
                  <td className="td text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(emp)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(emp)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Edit Employee' : 'Add New Employee'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Employee'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Employee Code *">
            <input
              className="input font-mono uppercase"
              value={form.employee_code}
              onChange={(e) => setForm({ ...form, employee_code: e.target.value.toUpperCase() })}
              disabled={!!editing}
              placeholder="e.g. EMP-001"
            />
          </Field>
          <Field label="Employment Status">
            <select
              className="input"
              value={form.employment_status}
              onChange={(e) => setForm({ ...form, employment_status: e.target.value })}
            >
              <option value="regular">Regular</option>
              <option value="probationary">Probationary</option>
              <option value="contractual">Contractual</option>
              <option value="part_time">Part-Time</option>
            </select>
          </Field>

          <Field label="First Name *">
            <input
              className="input"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              placeholder="Juan"
            />
          </Field>
          <Field label="Last Name *">
            <input
              className="input"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              placeholder="dela Cruz"
            />
          </Field>

          <Field label="Middle Name">
            <input
              className="input"
              value={form.middle_name}
              onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
              placeholder="Optional"
            />
          </Field>
          <Field label="Date Hired">
            <input
              type="date"
              className="input"
              value={form.date_hired}
              onChange={(e) => setForm({ ...form, date_hired: e.target.value })}
            />
          </Field>

          <Field label="Department">
            <select
              className="input"
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
            >
              <option value="">— Select —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Position / Job Title">
            <input
              className="input"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              placeholder="e.g. Software Engineer"
            />
          </Field>

          <Field label="Daily Rate (₱)">
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.daily_rate}
              onChange={(e) => setForm({ ...form, daily_rate: e.target.value })}
              placeholder="610.00"
            />
          </Field>
          <div className="flex flex-col justify-end">
            {form.daily_rate > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Hourly rate: ₱{(parseFloat(form.daily_rate) / 8).toFixed(2)}/hr
              </p>
            )}
          </div>

          <Field label="Schedule In">
            <input
              type="time"
              className="input"
              value={form.schedule_in}
              onChange={(e) => setForm({ ...form, schedule_in: e.target.value })}
            />
          </Field>
          <Field label="Schedule Out">
            <input
              type="time"
              className="input"
              value={form.schedule_out}
              onChange={(e) => setForm({ ...form, schedule_out: e.target.value })}
            />
          </Field>

          <div className="col-span-2 flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <label htmlFor="is_active" className="text-sm text-slate-600 cursor-pointer">
              Active employee
            </label>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Employee"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn-danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete{' '}
          <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong>?
          This will also delete all their attendance records and cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
