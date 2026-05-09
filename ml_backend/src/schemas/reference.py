from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class ClimaticGroupBase(BaseModel):
    name: str = Field(..., description="Название группы климатических проявлений")


class ClimaticGroupOut(ClimaticGroupBase):
    id: int

    class Config:
        from_attributes = True


class WorkReferenceBase(BaseModel):
    name: str = Field(..., description="Название вида работ (например, 'Земляные работы')")
    temp_min: float
    temp_max: float
    wind_max: float
    rain_max: float
    normative: Optional[str] = None
    critical_factors: Optional[Dict[str, Any]] = None


class WorkReferenceCreate(WorkReferenceBase):
    group_ids: List[int] = Field(default_factory=list, description="ID климатических групп, к которым относится работа")


class WorkReferenceUpdate(BaseModel):
    name: Optional[str] = None
    temp_min: Optional[float] = None
    temp_max: Optional[float] = None
    wind_max: Optional[float] = None
    rain_max: Optional[float] = None
    normative: Optional[str] = None
    critical_factors: Optional[Dict[str, Any]] = None
    group_ids: Optional[List[int]] = None


class WorkReferenceOut(WorkReferenceBase):
    id: int
    groups: List[ClimaticGroupOut] = Field(default_factory=list)

    class Config:
        from_attributes = True
