"use client";

// Registers the service worker (T12). No UI — runs once on mount.
import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
