export type VisitAvailabilitySlot = {
  date: string;
  time: string;
};

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const toDateStr = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const formatShortDate = (dateStr: string) => {
  const [, month, day] = dateStr.split("-");
  return `${MONTH_NAMES[parseInt(month, 10) - 1].slice(0, 3)} ${parseInt(day, 10)}`;
};

export const formatFullDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  return `${WEEKDAYS[date.getDay()]}, ${MONTH_NAMES[parseInt(month, 10) - 1].slice(0, 3)} ${parseInt(day, 10)}`;
};

export const addGapToDate = (dateStr: string, months: number, days: number) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (months > 0) date.setMonth(date.getMonth() + months);
  if (days > 0) date.setDate(date.getDate() + days);
  return toDateStr(date);
};

export const parseTimeLabelToMinutes = (timeLabel: string) => {
  const [time, meridiem] = timeLabel.split(" ");
  const [hourRaw, minuteRaw] = time.split(":").map(Number);
  let hour = hourRaw % 12;
  if (meridiem === "PM") hour += 12;
  return hour * 60 + minuteRaw;
};

export const buildHalfHourTimeSlots = () => {
  const slots: string[] = [];

  for (let minutes = 8 * 60; minutes <= 22 * 60; minutes += 30) {
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const meridiem = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    slots.push(`${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`);
  }

  return slots;
};

export const sortAvailabilitySlots = (slots: VisitAvailabilitySlot[]) =>
  [...slots].sort((left, right) => {
    if (left.date !== right.date) return left.date.localeCompare(right.date);
    return parseTimeLabelToMinutes(left.time) - parseTimeLabelToMinutes(right.time);
  });

export const groupAvailabilityByDate = (slots: VisitAvailabilitySlot[]) => {
  const grouped = new Map<string, VisitAvailabilitySlot[]>();

  sortAvailabilitySlots(slots).forEach((slot) => {
    const existing = grouped.get(slot.date) || [];
    existing.push(slot);
    grouped.set(slot.date, existing);
  });

  return Array.from(grouped.entries()).map(([date, groupedSlots]) => ({
    date,
    slots: groupedSlots,
  }));
};

export const splitSlotsByMeridiem = (slots: VisitAvailabilitySlot[]) => ({
  am: slots.filter((slot) => slot.time.endsWith("AM")),
  pm: slots.filter((slot) => slot.time.endsWith("PM")),
});
