'use strict';

/**
 * DTR Calculator — Philippine Labor Code Compliant
 *
 * Legal References:
 *  Art. 83 — Normal hours of work: 8 hours/day
 *  Art. 86 — Night-shift differential: +10% for 10 PM – 6 AM
 *  Art. 87 — Overtime: +25% regular day OT (125% of basic rate)
 *  Art. 93 — Rest day: 130% regular pay; OT = 130% × 130% = 169% of basic rate
 *  Art. 94 — Regular holiday: 200% regular pay; OT = 200% × 130% = 260% of basic rate
 *  Art. 88 — Undertime NOT offset by overtime (tardiness ≠ OT credit)
 *  Art. 93 — Rest day overtime: 130% rate
 *  Book III, Rule IV, Sec. 4 — Meal period: minimum 60 minutes, unpaid
 */

const SCHEDULE = {
  START_MINS: 8 * 60,        // 08:00 = 480 min
  END_MINS:   17 * 60,       // 17:00 = 1020 min
  LUNCH_MINS: 60,            // mandatory unpaid break
  REGULAR_WORK_MINS: 8 * 60, // standard workday
};

const NIGHT_DIFF = {
  START_MINS: 22 * 60, // 22:00 = 1320 min
  END_MINS:   6 * 60,  // 06:00 = 360 min (next day boundary)
};

/**
 * Regular-hours pay multiplier (applied to basic hourly rate).
 * Even within 8 hours, rest days and holidays require higher base pay.
 */
const REGULAR_PAY_MULTIPLIERS = {
  regular:         1.00, // 100% — Art. 83
  rest_day:        1.30, // 130% — Art. 93
  special_holiday: 1.30, // 130% — Rule IV, Sec. 6
  regular_holiday: 2.00, // 200% double pay — Art. 94
};

/**
 * OT total multiplier (applied to basic hourly rate).
 * Formula: regular_pay_rate × 1.30 OT premium
 *   Regular day  → 1.00 × 1.25 = 1.25  (Art. 87)
 *   Rest/Spl.Hol → 1.30 × 1.30 = 1.69  (Art. 93)
 *   Reg. Holiday → 2.00 × 1.30 = 2.60  (Art. 94)
 */
const OT_MULTIPLIERS = {
  regular:         1.25,
  rest_day:        1.69,
  special_holiday: 1.69,
  regular_holiday: 2.60,
};

const NIGHT_DIFF_RATE = 0.10; // Article 86 → +10%

/**
 * Converts "HH:MM" or "HH:MM:SS" to minutes from midnight.
 * @param {string|null} t
 * @returns {number|null}
 */
function toMins(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Returns the number of night-differential minutes within a
 * single time segment [startMins, endMins].
 * Night diff window: 22:00 (1320) → midnight + 00:00 → 06:00 (360).
 */
function nightDiffInSegment(startMins, endMins) {
  if (startMins === null || endMins === null || endMins <= startMins) return 0;
  let nd = 0;

  // 22:00 → midnight portion
  if (endMins > NIGHT_DIFF.START_MINS) {
    const s = Math.max(startMins, NIGHT_DIFF.START_MINS);
    const e = Math.min(endMins, 24 * 60);
    if (e > s) nd += e - s;
  }

  // midnight → 06:00 portion (early-morning shifts / OT past midnight)
  if (startMins < NIGHT_DIFF.END_MINS) {
    const e = Math.min(endMins, NIGHT_DIFF.END_MINS);
    if (e > startMins) nd += e - startMins;
  }

  return nd;
}

/**
 * Calculates all DTR metrics from four time punches.
 *
 * @param {Object}      params
 * @param {string}      params.am_in        Clock-in         (required, "HH:MM")
 * @param {string|null} params.am_out       Lunch start      (nullable)
 * @param {string|null} params.pm_in        Lunch end        (nullable)
 * @param {string|null} params.pm_out       Clock-out        (nullable)
 * @param {string}      params.day_type     'regular' | 'rest_day' | 'special_holiday' | 'regular_holiday'
 * @param {number}      params.hourly_rate  Hourly rate in PHP (daily_rate / 8)
 *
 * @returns {Object} Calculated DTR metrics and optional pay breakdown
 */
function calculateDTR({
  am_in,
  am_out       = null,
  pm_in        = null,
  pm_out       = null,
  day_type     = 'regular',
  hourly_rate  = 0,
}) {
  if (!am_in) throw new Error('AM_IN (clock-in time) is required.');

  const amIn  = toMins(am_in);
  const amOut = toMins(am_out);
  const pmIn  = toMins(pm_in);
  const pmOut = toMins(pm_out);

  if (amIn === null) throw new Error('Invalid AM_IN format. Expected HH:MM.');

  // ── Tardiness ──────────────────────────────────────────────
  // Art. 88: late minutes are deducted regardless of OT rendered.
  const lateMinutes = Math.max(0, amIn - SCHEDULE.START_MINS);

  // ── Undertime ──────────────────────────────────────────────
  let undertimeMinutes = 0;
  if (pmOut !== null && pmOut < SCHEDULE.END_MINS) {
    undertimeMinutes = SCHEDULE.END_MINS - pmOut;
  }

  // ── Total Rendered Minutes ─────────────────────────────────
  // Edge-case matrix:
  //   A) All 4 punches present     → morning + afternoon (lunch auto-excluded)
  //   B) am_out present, no pm_out → morning only (half-day AM)
  //   C) am_out / pm_in missing    → auto-deduct 1 hr mandatory lunch (Book III Rule IV Sec.4)
  //   D) Only am_in                → 0 hours (forgot to punch out entirely)
  const missedLunchPunch = !am_out || !pm_in;
  let totalRenderedMins = 0;

  if (!missedLunchPunch && pmOut !== null) {
    // Case A — standard 4-punch day
    const morning   = Math.max(0, amOut - amIn);
    const afternoon = Math.max(0, pmOut - pmIn);
    totalRenderedMins = morning + afternoon;
  } else if (!missedLunchPunch && pmOut === null) {
    // Case B — clocked out for lunch but no PM punches (half-day AM)
    totalRenderedMins = Math.max(0, amOut - amIn);
  } else if (missedLunchPunch && pmOut !== null) {
    // Case C — forgot lunch punch; deduct mandatory 1-hour break
    totalRenderedMins = Math.max(0, pmOut - amIn - SCHEDULE.LUNCH_MINS);
  }
  // Case D → remains 0

  // ── Overtime ───────────────────────────────────────────────
  // OT = every minute worked beyond 17:00.
  // Per Art. 88, it does NOT cancel out tardiness deductions.
  let otMinutes = 0;
  if (pmOut !== null && pmOut > SCHEDULE.END_MINS) {
    otMinutes = pmOut - SCHEDULE.END_MINS;
  }

  // ── Night Differential (Art. 86) ──────────────────────────
  let nightDiffMins = 0;
  if (!missedLunchPunch && amOut !== null && pmIn !== null) {
    nightDiffMins += nightDiffInSegment(amIn, amOut);
    if (pmOut !== null) nightDiffMins += nightDiffInSegment(pmIn, pmOut);
  } else if (pmOut !== null) {
    nightDiffMins = nightDiffInSegment(amIn, pmOut);
  }

  // ── Pay Computation ────────────────────────────────────────
  const hr              = parseFloat(hourly_rate) || 0;
  const regMultiplier   = REGULAR_PAY_MULTIPLIERS[day_type] ?? 1.00;
  const otMultiplier    = OT_MULTIPLIERS[day_type]           ?? 1.25;
  const regularHours    = Math.min(totalRenderedMins, SCHEDULE.REGULAR_WORK_MINS) / 60;
  const otHours         = otMinutes / 60;
  const ndHours         = nightDiffMins / 60;

  // Regular pay: hourly_rate × day_type_multiplier × hours worked (max 8)
  const regularPay         = regularHours * hr * regMultiplier;
  // OT pay: hourly_rate × OT_multiplier (already includes day type premium)
  const overtimePay        = otHours * hr * otMultiplier;
  // Night diff: +10% of basic hourly rate for each ND hour
  const nightDiffPay       = ndHours * hr * NIGHT_DIFF_RATE;
  // Deductions use basic hourly rate (Art. 88 — no day-type premium on deductions)
  const lateDeduction      = (lateMinutes / 60) * hr;
  const undertimeDeduction = (undertimeMinutes / 60) * hr;
  const grossPay           = regularPay + overtimePay + nightDiffPay - lateDeduction - undertimeDeduction;

  const r4 = (n) => parseFloat(n.toFixed(4));
  const r2 = (n) => parseFloat(n.toFixed(2));

  return {
    // Time
    total_rendered_hours: r4(totalRenderedMins / 60),
    late_minutes:         lateMinutes,
    undertime_minutes:    undertimeMinutes,
    overtime_minutes:     otMinutes,
    overtime_hours:       r4(otHours),
    night_diff_hours:     r4(ndHours),
    missed_lunch_punch:   missedLunchPunch,
    // Pay (PHP)
    regular_pay:          r2(regularPay),
    overtime_pay:         r2(overtimePay),
    night_diff_pay:       r2(nightDiffPay),
    late_deduction:       r2(lateDeduction),
    undertime_deduction:  r2(undertimeDeduction),
    gross_pay:            r2(grossPay),
    // Meta
    day_type,
    regular_rate_label: `${Math.round(regMultiplier * 100)}%`,
    ot_rate_label:      `${Math.round(otMultiplier * 100)}%`,
  };
}

module.exports = { calculateDTR, toMins, nightDiffInSegment };
