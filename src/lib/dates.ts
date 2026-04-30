import { format, parseISO } from "date-fns";

function coerceDate(value: string | Date) {
  return typeof value === "string" ? parseISO(value) : value;
}

export function fmtDate(value: string | Date | null | undefined) {
  if (!value) return "Not set";
  return format(coerceDate(value), "MMM d, yyyy");
}

export function fmtDateTime(value: string | Date | null | undefined) {
  if (!value) return "Not set";
  return format(coerceDate(value), "MMM d, yyyy h:mm a");
}

export function toDateTimeInputValue(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = coerceDate(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function dayKey(value: string | Date) {
  return format(coerceDate(value), "yyyy-MM-dd");
}

export function dayLabel(value: string | Date) {
  return format(coerceDate(value), "EEEE, MMMM d, yyyy");
}

export function dateValue(value: string | Date) {
  return coerceDate(value);
}
