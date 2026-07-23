// Public pricing model (marketing). Mirrors services/app/tiers.py; keep in sync.
// Values are display strings so ✅ / ✕ / quotas render uniformly.

export interface Package {
  id: "free" | "pro" | "business";
  name: string;
  emoji: string;
  price: string;
  period: string;
  tagline: string;
  highlight?: boolean; // the recommended package
}

export const PACKAGES: Package[] = [
  { id: "free", name: "Paket 1", emoji: "🆓", price: "0", period: "AZN", tagline: "Başlamaq üçün" },
  { id: "pro", name: "Paket 2", emoji: "💚", price: "10", period: "AZN/ay", tagline: "Ən populyar", highlight: true },
  { id: "business", name: "Paket 3", emoji: "💎", price: "25", period: "AZN/ay", tagline: "Peşəkar / təsərrüfat" },
];

export interface FeatureRow {
  label: string;
  values: [string, string, string]; // free, pro, business
  soon?: boolean; // feature is rolling out
}

// Order matches the agreed comparison table.
export const FEATURES: FeatureRow[] = [
  { label: "Sahə sayı", values: ["1 sahə", "5 sahə (~25 ha)", "Limitsiz + komanda"] },
  { label: "Peyk monitorinq", values: ["HLS 30m", "HLS + S2 10m", "HLS + S2 10m"] },
  { label: "İndekslər (NDVI…NBR)", values: ["✅", "✅ + NDRE/CIre", "✅ + NDRE/CIre"] },
  { label: "Raster overlay, timeline, müqayisə", values: ["✅", "✅", "✅"] },
  { label: "Hava proqnozu (7 gün)", values: ["✅", "✅", "✅"] },
  { label: "Sahə idarəetmə (skautinq/tapşırıq)", values: ["✅", "✅", "✅"] },
  { label: "AI aqronom məsləhəti", values: ["🎁 1/ay", "✅ 8/ay", "✅ 30/ay"] },
  { label: "AI chatbot", values: ["✕", "✅ 50/ay", "✅ 300/ay"] },
  { label: "Bilik Pasportu (torpaq/su/zərərverici)", values: ["✕", "✅", "✅"] },
  { label: "Çiləmə pəncərəsi + frost/heat alert", values: ["✕", "✅", "✅"] },
  { label: "Suvarma balansı (TAW/RAW, ET)", values: ["✕", "✅", "✅"] },
  { label: "Bildirişlər", values: ["in-app", "in-app + email", "+ WhatsApp"] },
  { label: "Zərərverici risk proqnozu", values: ["✕", "✕", "✅"], soon: true },
  { label: "Foto diaqnoz", values: ["✕", "✕", "✅ 30/ay"], soon: true },
  { label: "Gübrə kalkulyatoru", values: ["✕", "✕", "✅"], soon: true },
  { label: "Regional benchmark", values: ["✕", "✕", "✅"], soon: true },
  { label: "PDF/EUDR hesabatlar", values: ["✕", "✕", "✅"], soon: true },
  { label: "Araşdırma dərinliyi", values: ["qlobal", "qlobal+regional", "+ lokal"] },
];
