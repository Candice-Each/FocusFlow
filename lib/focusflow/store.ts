import type { BookItem, HardwareCalibrationState } from "./types";
import { DEFAULT_BOOKS } from "./data";
import { DEFAULT_HARDWARE_STATE } from "./types";

const K_HW = "focusflow_hardware_state";
const K_BOOKS = "focusflow_books";
const K_USER = "focusflow_user_name";

export function readHardwareState(): HardwareCalibrationState {
  if (typeof window === "undefined") return DEFAULT_HARDWARE_STATE;
  try {
    const raw = localStorage.getItem(K_HW);
    return raw ? { ...DEFAULT_HARDWARE_STATE, ...JSON.parse(raw) } : DEFAULT_HARDWARE_STATE;
  } catch {
    return DEFAULT_HARDWARE_STATE;
  }
}

export function writeHardwareState(s: HardwareCalibrationState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(K_HW, JSON.stringify(s)); } catch { /* ignore */ }
}

export function readBooks(): BookItem[] {
  if (typeof window === "undefined") return DEFAULT_BOOKS;
  try {
    const raw = localStorage.getItem(K_BOOKS);
    if (!raw) return DEFAULT_BOOKS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_BOOKS;
  } catch {
    return DEFAULT_BOOKS;
  }
}

export function writeBooks(books: BookItem[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(K_BOOKS, JSON.stringify(books)); } catch { /* ignore */ }
}

export function readUserName(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(K_USER); } catch { return null; }
}

export function writeUserName(name: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (name) localStorage.setItem(K_USER, name);
    else localStorage.removeItem(K_USER);
  } catch { /* ignore */ }
}