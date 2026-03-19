# DTR System — Daily Time Record
### Philippine Labor Code Compliant Payroll Web Application

A full-stack web application for managing employee attendance using the **4-Punch System**, with automatic calculation of tardiness, undertime, overtime, and night differentials per Philippine DOLE regulations.

---

## Features

| Feature | Detail |
|---|---|
| **4-Punch System** | AM_IN, AM_OUT (Lunch Start), PM_IN (Lunch End), PM_OUT |
| **Tardiness** | Calculated vs 8:00 AM schedule |
| **Undertime** | Calculated vs 5:00 PM schedule |
| **OT Multipliers** | Regular 125% · Rest Day 130% · Regular Holiday 200% |
| **Night Differential** | +10% premium for 10:00 PM – 6:00 AM (Art. 86) |
| **Art. 88 Compliance** | OT cannot offset tardiness |
| **Missed Lunch Punch** | Auto-deducts mandatory 1-hour break |
| **Pay Computation** | Full gross pay breakdown with deductions |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Deployment | Render.com (API + DB) + Vercel (Frontend) |

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone and setup

```bash
# Install backend dependencies
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Install frontend dependencies
cd ../frontend
npm install
cp .env.example .env
```

### 2. Create the database

```bash
# In PostgreSQL:
CREATE DATABASE dtr_db;
```

### 3. Run migrations

```bash
cd backend
npm run migrate
```

### 4. Start both servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open `http://localhost:5173`

---

## Free Deployment Guide

### Step 1 — Deploy Backend on Render.com (Free)

1. Push your project to GitHub
2. Go to [render.com](https://render.com) → **New → Blueprint**
3. Connect your GitHub repo
4. Render reads `backend/render.yaml` and auto-creates:
   - A **Web Service** (Node.js API)
   - A **PostgreSQL** database (free, 1 GB)
5. After deploy, copy your API URL (e.g. `https://dtr-api.onrender.com`)
6. Run the migration by adding a one-time command or via the Render shell:
   ```bash
   npm run migrate
   ```

> **Note:** Free Render services sleep after 15 minutes of inactivity and take ~30s to wake.

### Step 2 — Deploy Frontend on Vercel (Free)

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo, set **Root Directory** to `frontend`
3. Add Environment Variable:
   ```
   VITE_API_URL = https://dtr-api.onrender.com
   ```
4. Click **Deploy**

### Step 3 — Update CORS

After both are deployed, update the `FRONTEND_URL` environment variable on Render to your Vercel URL.

---

## API Reference

### Employees

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/employees` | List all employees |
| POST | `/api/employees` | Create employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |
| GET | `/api/employees/departments` | List departments |

### Attendance

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/attendance` | List records (filterable) |
| POST | `/api/attendance` | Create/update DTR record |
| POST | `/api/attendance/calculate` | Preview calculation (no save) |
| DELETE | `/api/attendance/:id` | Delete record |

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/stats` | Today's stats + recent records |

### Calculate Endpoint (No Auth Required)

```json
POST /api/attendance/calculate
{
  "am_in":       "08:15",
  "am_out":      "12:00",
  "pm_in":       "13:00",
  "pm_out":      "19:30",
  "day_type":    "regular",
  "hourly_rate": 76.25
}
```

**Response:**
```json
{
  "data": {
    "total_rendered_hours": 9.5,
    "late_minutes": 15,
    "undertime_minutes": 0,
    "overtime_minutes": 150,
    "overtime_hours": 2.5,
    "night_diff_hours": 0,
    "missed_lunch_punch": false,
    "regular_pay": 610.00,
    "overtime_pay": 238.28,
    "night_diff_pay": 0,
    "late_deduction": 19.06,
    "undertime_deduction": 0,
    "gross_pay": 829.22,
    "day_type": "regular",
    "ot_rate_label": "125%"
  }
}
```

---

## Philippine Labor Code Reference

| Article | Rule |
|---|---|
| Art. 83 | Normal hours of work: 8 hours per day |
| Art. 86 | Night-shift differential: +10% for work between 10 PM and 6 AM |
| Art. 87 | Overtime: +25% on regular day, employee works beyond 8 hours |
| Art. 88 | Undertime is NOT offset by overtime rendered |
| Art. 93 | Rest day/holiday overtime rates |
| Book III Rule IV Sec. 4 | Meal period: minimum 60 minutes, unpaid |

---

## License

MIT — Free to use for commercial and personal projects.
