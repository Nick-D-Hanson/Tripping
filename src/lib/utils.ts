import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initialsFromValue(value: string | null | undefined) {
  if (!value) return "?";

  const trimmed = value.trim();
  if (!trimmed) return "?";

  if (trimmed.includes("@")) {
    const localPart = trimmed.split("@")[0]?.replace(/[^a-zA-Z0-9]+/g, " ").trim();
    if (!localPart) return "?";
    const tokens = localPart.split(/\s+/).filter(Boolean);
    return tokens.slice(0, 2).map((token) => token[0]!.toUpperCase()).join("") || "?";
  }

  const tokens = trimmed.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "?";
  return tokens.slice(0, 2).map((token) => token[0]!.toUpperCase()).join("");
}
