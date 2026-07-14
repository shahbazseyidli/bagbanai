// Shared API types.

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  locale?: string | null;
  is_admin?: boolean;
}

export type Role = "owner" | "admin" | "member" | "viewer";

export interface Org {
  id: string;
  name: string;
  country?: string | null;
  role: Role;
}

export interface Member {
  user_id: string;
  email: string;
  full_name?: string | null;
  role: Role;
  status: string;
}

export interface Invite {
  token: string;
  expires_at: string;
  accept_path: string;
}

export interface Farm {
  id: string;
  org_id: string;
  name: string;
  region?: string | null;
}

export interface Field {
  id: string;
  farm_id: string;
  org_id: string;
  name: string;
  area_ha: number;
  mgrs_tiles?: string[] | null;
}

export interface Polygon {
  type: "Polygon";
  coordinates: number[][][];
}

export type DataStatus = "none" | "queued" | "processing" | "ready" | "failed";

export interface FieldDetail extends Field {
  geom?: Polygon | null;
  centroid?: { type: "Point"; coordinates: [number, number] } | null;
  data_status?: DataStatus;
  data_progress_done?: number;
  data_progress_total?: number;
  data_eta_seconds?: number | null;
}

// GET /api/fields/{id}/data-status
export interface FieldDataStatus {
  status: DataStatus;
  done: number;
  total: number;
  eta_seconds: number | null;
  ready_at: string | null;
}

// One satellite scene with a rendered raster (GET /api/fields/{id}/scenes)
export interface RasterScene {
  scene_id: string;
  date: string;
  cloud_pct: number | null;
  tile_url: string;
}

export interface RasterScenes {
  index: string;
  colormap: string;
  rescale: string;
  scenes: RasterScene[];
}

export interface FieldMetadata {
  crop_type: string;
  variety?: string;
  planting_date?: string;
  expected_harvest?: string;
  difficulties?: Array<Record<string, unknown>>;
  soil_type?: string;
  soil_ph?: number | string;
  irrigation_method?: string;
  irrigation_available?: boolean;
  previous_crop?: string;
  rotation_history?: Array<Record<string, unknown>>;
  fertilizer_history?: Array<Record<string, unknown>>;
  seeding_density?: number | string;
  growth_stage?: string;
  elevation_m?: number | string;
  slope_deg?: number | string;
  aspect_deg?: number | string;
  tillage_practice?: string;
  target_yield?: number | string;
  prior_yields?: Array<Record<string, unknown>>;
  pest_history?: Array<Record<string, unknown>>;
  notes?: string;
}

export interface IndexPoint {
  date: string;
  mean: number | null;
  p10?: number | null;
  p50?: number | null;
  p90?: number | null;
}

// Response of GET /api/fields/{id}/indices
export interface IndexSeries {
  index: string;
  series: IndexPoint[];
}

// Response of GET /api/fields/{id}/indices/benchmark — weekly regional average.
export interface IndexBenchmarkPoint {
  date: string; // Monday of the ISO week
  mean: number;
  n?: number;
}
export interface IndexBenchmark {
  index: string;
  scope: string; // "crop" | "all"
  crop_type?: string | null;
  series: IndexBenchmarkPoint[];
}

export interface Scouting {
  id: string;
  field_id: string;
  category: string;
  severity?: number | null;
  note?: string | null;
  lon?: number | null;
  lat?: number | null;
  photos?: string[] | null;
  created_at?: string;
}

export interface Task {
  id: string;
  org_id: string;
  title: string;
  type?: string | null;
  farm_id?: string | null;
  field_id?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  priority?: string | null;
  status: string;
  notes?: string | null;
}

export interface Operation {
  id: string;
  field_id: string;
  type: string;
  performed_on: string;
  inputs?: Array<Record<string, unknown>> | null;
  cost?: number | null;
  currency?: string | null;
  notes?: string | null;
}

export interface Yield {
  id: string;
  field_id: string;
  season_year: number;
  crop_type?: string | null;
  yield_value?: number | null;
  yield_unit?: string | null;
  area_ha?: number | null;
  notes?: string | null;
}

// ---- Subsidy ----

export interface SubsidyDimensions {
  intensities?: string[];
  region_categories?: string[];
  irrigations?: string[];
  planting_periods?: string[];
  needs_region_rayon?: boolean;
  eligible_regions?: string[];
  units?: string[];
}

export interface SubsidyOptions {
  level: string;
  subsidy_types?: string[];
  crop_groups?: string[];
  crops?: string[];
  dimensions?: SubsidyDimensions;
}

export interface SubsidyCalcResult {
  matched_rate: {
    coefficient: number;
    amount_per_unit: number;
    unit: string;
    label_az: string;
  } | null;
  quantity: number;
  subtotal: number;
  modifiers_applied: string[];
  total_amount: number;
  currency: string;
  eligibility_ok: boolean;
  warnings: string[];
  notes_az: string;
  matched_rate_id?: string | null;
}

export interface SubsidyRate {
  id?: string;
  subsidy_type?: string;
  crop_group?: string;
  crop?: string;
  intensity?: string;
  region_category?: string;
  irrigation?: string;
  planting_period?: string;
  coefficient?: number;
  amount_per_unit?: number;
  unit?: string;
  label_az?: string;
  [key: string]: unknown;
}

// ---- Admin panel ----

// GET /api/admin/overview
export interface AdminOverview {
  users: number;
  orgs: number;
  farms: number;
  fields: number;
  advice_count: number;
  chat_count: number;
  ai_calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  cost_usd_month: number;
  provider: string;
  model: string;
  ai_configured: boolean;
}

// GET /api/admin/users -> { users: AdminUser[] }
export interface AdminUser {
  id: string;
  email: string;
  full_name?: string | null;
  locale?: string | null;
  is_admin: boolean;
  created_at: string;
  org_name?: string | null;
  role?: string | null;
  ai_calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  last_active?: string | null;
}

// GET /api/admin/activity -> { activity: AdminActivityItem[] }
export interface AdminActivityItem {
  at: string;
  user_email?: string | null;
  type: string;
  detail: string;
}

// GET /api/admin/usage -> { group: string, rows: AdminUsageRow[] }
// rows carry the fields relevant to the requested grouping (user_id/email, model, or day).
export interface AdminUsageRow {
  user_id?: string;
  email?: string;
  model?: string;
  day?: string;
  ai_calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
}

// GET /api/admin/billing
export interface AdminBillingOrg {
  org_id: string;
  org_name: string;
  plan: string;
  ai_calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  suggested_charge_usd: number;
}

export interface AdminBilling {
  markup_x: number;
  orgs: AdminBillingOrg[];
  total_cost_usd: number;
  total_suggested_usd: number;
  month_cost_usd: number;
}
