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
