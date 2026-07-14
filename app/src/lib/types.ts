// Shared API types.

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  locale?: string | null;
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

export interface FieldDetail extends Field {
  geom?: Polygon | null;
  centroid?: { type: "Point"; coordinates: [number, number] } | null;
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
