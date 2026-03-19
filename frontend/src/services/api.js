const BASE = import.meta.env.VITE_API_URL || '';

async function req(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

const qs = (params = {}) => {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const str = new URLSearchParams(filtered).toString();
  return str ? `?${str}` : '';
};

export const employeeAPI = {
  getDepartments: ()       => req('GET', '/api/employees/departments'),
  getAll:  (p = {})        => req('GET', `/api/employees${qs(p)}`),
  getOne:  (id)            => req('GET', `/api/employees/${id}`),
  create:  (data)          => req('POST', '/api/employees', data),
  update:  (id, data)      => req('PUT', `/api/employees/${id}`, data),
  remove:  (id)            => req('DELETE', `/api/employees/${id}`),
};

export const attendanceAPI = {
  getAll:     (p = {}) => req('GET', `/api/attendance${qs(p)}`),
  upsert:     (data)   => req('POST', '/api/attendance', data),
  calculate:  (data)   => req('POST', '/api/attendance/calculate', data),
  remove:     (id)     => req('DELETE', `/api/attendance/${id}`),
};

export const dashboardAPI = {
  getStats: () => req('GET', '/api/dashboard/stats'),
};
