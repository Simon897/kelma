import { KEYS, readJSON, writeJSON } from "./storage";

export interface Settings {
  highContrast: boolean;
}

export const DEFAULT_SETTINGS: Settings = { highContrast: false };

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...(readJSON<Partial<Settings>>(KEYS.settings) ?? {}) };
}

export function saveSettings(s: Settings) {
  writeJSON(KEYS.settings, s);
  applySettings(s);
}

/** Reflect settings on <html> so CSS tokens can switch. */
export function applySettings(s: Settings) {
  if (typeof document === "undefined") return;
  document.documentElement.toggleAttribute("data-contrast", s.highContrast);
}
