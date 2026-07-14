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


# ---- auth ----
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: Optional[str] = None
    locale: str = "az"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None
    locale: str = "az"
    is_admin: bool = False


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
    notes: Optional[str] = None


class YieldIn(BaseModel):
    field_id: str
    season_year: int
    crop_type: Optional[str] = None
    yield_value: Optional[float] = None
    yield_unit: Optional[str] = None    # t_ha|kg|t
    area_ha: Optional[float] = None
    notes: Optional[str] = None
