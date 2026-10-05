import type { ActivitySummary, CalendarDay } from '../domain/types.js';

export const activityLevel = (count: number): 0 | 1 | 2 | 3 => (count === 0 ? 0 : count < 4 ? 1 : count < 10 ? 2 : 3);

/** Groups days into Sunday-first weeks, the way GitHub draws its calendar. */
const toWeeks = (days: CalendarDay[]): CalendarDay[][] => {
  const weeks: CalendarDay[][] = [];
  for (const day of days) {
    if (weeks.length === 0 || day.weekday === 0) weeks.push([]);
    weeks[weeks.length - 1]!.push(day);
  }
  return weeks;
};

/**
 * Today never breaks a streak: it is still in progress, so the streak counts back from yesterday
 * when today has no contribution yet.
 */
const currentStreakOf = (days: CalendarDay[]): number => {
  let i = days.length - 1;
  if (i >= 0 && days[i]!.count === 0) i--;
  let streak = 0;
  for (; i >= 0 && days[i]!.count > 0; i--) streak++;
  return streak;
};

export const summarizeActivity = (calendar: CalendarDay[]): ActivitySummary => {
  const weeks = toWeeks(calendar);
  const weekTotals = weeks.map((w) => w.reduce((sum, d) => sum + d.count, 0));
  const bestWeekCount = Math.max(0, ...weekTotals);
  const bestWeekIndex = Math.max(0, weekTotals.indexOf(bestWeekCount));

  let bestStreak = 0;
  let run = 0;
  let bestDay = { date: calendar[0]?.date ?? '', count: 0 };
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  for (const day of calendar) {
    run = day.count > 0 ? run + 1 : 0;
    bestStreak = Math.max(bestStreak, run);
    if (day.count > bestDay.count) bestDay = { date: day.date, count: day.count };
    weekdayTotals[(day.weekday + 6) % 7]! += day.count;
  }

  return {
    weeks,
    total: calendar.reduce((sum, d) => sum + d.count, 0),
    activeDays: calendar.filter((d) => d.count > 0).length,
    currentStreak: currentStreakOf(calendar),
    bestStreak,
    bestWeek: { index: bestWeekIndex, start: weeks[bestWeekIndex]?.[0]?.date ?? '', count: bestWeekCount },
    bestDay,
    mp14: calendar.slice(-14).reduce((sum, d) => sum + d.count, 0),
    today: calendar.at(-1) ?? null,
    yesterday: calendar.at(-2) ?? null,
    weekdayTotals,
  };
};
