// Winter Code Fest runs every other day from November 1st through December 31st.
// Day 1 is November 1st, day 2 is November 3rd, ... and day 31 is December 31st.

const START_MONTH = 10; // November, month is 0 indexed
const DAYS_BETWEEN = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const MONTHS = [START_MONTH, START_MONTH + 1];

/**
 * Get the year of the current fest. Use last year's if it's January
 */
export function festYear(now = new Date()): number {
  return now.getFullYear() - (now.getMonth() === 0 ? 1 : 0);
}

/**
 * Get the date that a day of the fest is released on
 */
export function dayToDate(day: number, year = festYear()): Date {
  return new Date(year, START_MONTH, 1 + (day - 1) * DAYS_BETWEEN);
}

/**
 * Get which day of the fest is released on a date, if any
 */
export function dateToDay(date: Date): number | undefined {
  const start = new Date(date.getFullYear(), START_MONTH, 1);
  // round to ignore daylight saving time changes
  const daysSinceStart = Math.round(
    (date.getTime() - start.getTime()) / MS_PER_DAY
  );

  if (daysSinceStart < 0 || daysSinceStart % DAYS_BETWEEN !== 0) {
    return undefined;
  }

  return daysSinceStart / DAYS_BETWEEN + 1;
}

/**
 * Format a date in YYYY-MM-DD format
 */
export function yyyymmdd(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}
