"use client";

// D4.5 — data-saver. Farmers on metered/slow 3G shouldn't auto-download heavy satellite raster
// tiles. When ON (explicit toggle OR the browser's own Save-Data hint), the full-bleed field raster
// is not auto-loaded — the user taps to load it. Also drives lighter defaults elsewhere.
import { useEffect, useState } from "react";

const KEY = "bagban_data_saver";

export function isDataSaver(): boolean {
  try {
    if (localStorage.getItem(KEY) === "1") return true;
    if (localStorage.getItem(KEY) === "0") return false;
    // No explicit choice → honour the browser's Save-Data hint.
    const conn = (navigator as unknown as { connection?: { saveData?: boolean } }).connection;
    return !!conn?.saveData;
  } catch {
    return false;
  }
}

export function setDataSaver(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
    window.dispatchEvent(new Event("bagban-datasaver"));
  } catch {
    /* noop */
  }
}

/** Reactive hook — re-renders when the toggle changes. */
export function useDataSaver(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(isDataSaver());
    sync();
    window.addEventListener("bagban-datasaver", sync);
    return () => window.removeEventListener("bagban-datasaver", sync);
  }, []);
  return on;
}
