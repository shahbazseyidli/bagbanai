"""Pydantic request/response models."""
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


class OrgRole(str, Enum):
    owner = "owner"
    admin = "admin"
    agronomist = "agronomist"
    worker = "worker"
    viewer = "viewer"


class UserRole(str, Enum):
    """Global marketplace persona (0031), distinct from OrgRole membership."""
    farmer = "farmer"
    lab = "lab"
    consultant = "consultant"
    supplier = "supplier"


# ---- auth ----
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: Optional[str] = None
    locale: str = "az"
    role: UserRole = UserRole.farmer
    country: Optional[str] = None
    region: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class VerifyOtpIn(BaseModel):
    email: EmailStr
    code: str


class ResendOtpIn(BaseModel):
    email: EmailStr


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None
    locale: str = "az"
    is_admin: bool = False
    role: UserRole = UserRole.farmer
    country: Optional[str] = None
    region: Optional[str] = None


# ---- organizations / membership ----
class OrgIn(BaseModel):
    name: str
    country: str = "AZ"


class OrgOut(BaseModel):
    id: str
    name: str
    country: str
    role: Optional[OrgRole] = None


class InviteIn(BaseModel):
    email: EmailStr
    role: OrgRole = OrgRole.viewer


class RoleChangeIn(BaseModel):
    role: OrgRole


# ---- farms ----
class FarmIn(BaseModel):
    org_id: str
    name: str
    region: Optional[str] = None


class FarmOut(BaseModel):
    id: str
    org_id: str
    name: str
    region: Optional[str] = None


# ---- fields ----
class FieldIn(BaseModel):
    farm_id: str
    name: str
    # GeoJSON polygon coordinates: [[[lon,lat], ...]] (single ring, first ring used)
    geometry: dict[str, Any]


class FieldOut(BaseModel):
    id: str
    farm_id: str
    org_id: str
    name: str
    area_ha: Optional[float] = None
    mgrs_tiles: Optional[list[str]] = None


class FieldMetadataIn(BaseModel):
    crop_type: str
    crop_cycle: Optional[str] = None
    region: Optional[str] = None
    economic_region: Optional[str] = None
    variety: Optional[str] = None
    planting_date: Optional[str] = None
    expected_harvest: Optional[str] = None
    difficulties: list[Any] = []
    soil_type: Optional[str] = None
    soil_ph: Optional[float] = None
    irrigation_method: Optional[str] = None
    irrigation_available: bool = False
    previous_crop: Optional[str] = None
    rotation_history: list[Any] = []
    fertilizer_history: list[Any] = []
    seeding_density: Optional[float] = None
    growth_stage: Optional[str] = None
    elevation_m: Optional[float] = None
    slope_deg: Optional[float] = None
    aspect_deg: Optional[float] = None
    tillage_practice: Optional[str] = None
    target_yield: Optional[float] = None
    prior_yields: list[Any] = []
    pest_history: list[Any] = []
    notes: Optional[str] = None


# ---- subsidy (§30) ----
class SubsidyCalcIn(BaseModel):
    year: int = 2026
    subsidy_type: str
    crop_group: str
    crop: str
    intensity: Optional[str] = None
    region_category: Optional[str] = None
    region_rayon: Optional[str] = None
    irrigation: Optional[str] = None
    planting_period: Optional[str] = None
    quantity_ha: Optional[float] = None
    tons: Optional[float] = None
    modifiers: dict[str, Any] = {}
    field_id: Optional[str] = None
    as_of_date: Optional[str] = None   # ISO date; drives the apple/peach cutoff


class SubsidySaveIn(SubsidyCalcIn):
    org_id: Optional[str] = None


# ---- scouting / tasks / operations / yields (§14–16) ----
class ScoutingIn(BaseModel):
    field_id: str
    category: str                       # pest|disease|weed|nutrient|water|damage|other
    severity: Optional[str] = None      # low|medium|high
    note: Optional[str] = None
    lon: Optional[float] = None
    lat: Optional[float] = None
    photos: list[str] = []              # storage paths (from /api/uploads)


class TaskIn(BaseModel):
    org_id: str
    title: str
    type: Optional[str] = None
    farm_id: Optional[str] = None
    field_id: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None


class TaskStatusIn(BaseModel):
    status: str                         # todo|in_progress|done|cancelled


class OperationIn(BaseModel):
    field_id: str
    type: str                           # planting|spraying|fertilizing|irrigation|harvest|tillage|other
    performed_on: str
    inputs: list[Any] = []              # [{product,rate,unit}]
    cost: Optional[float] = None
    currency: str = "AZN"
    phi_days: Optional[int] = None      # pre-harvest interval (days) — spray safety countdown (B6)
    notes: Optional[str] = None


class YieldIn(BaseModel):
    field_id: str
    season_year: int
    crop_type: Optional[str] = None
    yield_value: Optional[float] = None
    yield_unit: Optional[str] = None    # t_ha|kg|t
    area_ha: Optional[float] = None
    revenue: Optional[float] = None     # total revenue (AZN) — for per-field P&L (0032)
    price: Optional[float] = None       # optional price per unit (AZN)
    notes: Optional[str] = None


# ---- marketplace: provider profiles + catalog (0031) ----
class ProviderIn(BaseModel):
    kind: UserRole                       # lab | consultant | supplier
    company: str = Field(min_length=1)
    bio: Optional[str] = None
    specializations: list[str] = []
    country: Optional[str] = None
    region: Optional[str] = None
    address: Optional[str] = None
    coverage: Optional[str] = None
    phone: Optional[str] = None


class ProviderOut(BaseModel):
    id: str
    user_id: str
    kind: str
    company: str
    bio: Optional[str] = None
    specializations: list[str] = []
    country: Optional[str] = None
    region: Optional[str] = None
    address: Optional[str] = None
    coverage: Optional[str] = None
    phone: Optional[str] = None
    rating: Optional[float] = None
    order_count: int = 0
    featured: bool = False


class CatalogItemIn(BaseModel):
    name: str = Field(min_length=1)
    category: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    currency: str = "AZN"
    description: Optional[str] = None


class CatalogItemOut(CatalogItemIn):
    id: str
    provider_id: str


# ---- marketplace: messaging (0031) ----
class StartConversationIn(BaseModel):
    other_user_id: str
    kind: str = "peer"                   # peer | provider
    body: Optional[str] = None           # optional first message


class MessageIn(BaseModel):
    body: str = Field(min_length=1)


class MessageOut(BaseModel):
    id: str
    sender_id: str
    body: str
    created_at: str
    mine: bool = False


class ConversationOut(BaseModel):
    id: str
    other_user_id: str
    other_name: Optional[str] = None
    other_role: Optional[str] = None
    kind: str = "peer"
    last_text: Optional[str] = None
    last_at: Optional[str] = None


# ---- fertilizer plans (E8, 0031) ----
class FertilizerPlanIn(BaseModel):
    product: str = Field(min_length=1)
    category: Optional[str] = None
    zone: Optional[str] = None
    dose: Optional[str] = None
    planned_on: Optional[str] = None     # ISO date
    status: str = "planned"
    source: str = "manual"
    notes: Optional[str] = None


class FertilizerPlanOut(FertilizerPlanIn):
    id: str
    field_id: str


# ---- field photos (E10, 0031) ----
class FieldPhotoOut(BaseModel):
    id: str
    field_id: str
    photo_path: str
    ai_label: Optional[str] = None
    ai_condition: Optional[str] = None
    ai_notes: Optional[str] = None
    created_at: str
