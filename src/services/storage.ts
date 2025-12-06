// Storage helpers for persisting timezones.
import type { TimezoneEntry } from "../types";

const STORAGE_KEY = "timezones";

export function loadSavedTimezones(fallback: TimezoneEntry[]): TimezoneEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TimezoneEntry[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export function saveTimezones(list: TimezoneEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
