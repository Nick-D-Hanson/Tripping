import { format, parseISO } from "date-fns";

export function fmtDate(value: string | Date | null | undefined) {
  if (!value) return "Not set";
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "MMM d, yyyy");
}

export function fmtDateTime(value: string | Date | null | undefined) {
  if (!value) return "Not set";
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "MMM d, yyyy h:mm a");
}

export function dayKey(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "yyyy-MM-dd");
}

export function dayLabel(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "EEEE, MMMM d, yyyy");
}
