/** Compare calendar dates, avoiding noon rounding and daylight-saving offsets. */
export function relativeUpcomingDate(date: string, now = new Date()): string {
  const [year, month, day] = date.split("-").map(Number);
  const dueDay = Date.UTC(year, month - 1, day);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((dueDay - today) / 86_400_000);
  return days === 0 ? "Today" : days === 1 ? "Tomorrow" : days < 0
    ? `${Math.abs(days)} ${days === -1 ? "day" : "days"} overdue`
    : `In ${days} days`;
}
