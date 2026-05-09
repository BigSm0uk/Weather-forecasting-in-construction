from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class RegionBase(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float

class RegionCreate(RegionBase):
    pass

from schemas.ml import ModelMetricsOut

class RegionOut(RegionBase):
    created_at: datetime
    models: List[ModelMetricsOut] = []
    
    class Config:
        from_attributes = True

class TrainRegionRequest(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    incremental: bool = False

class TrainRegionResponse(BaseModel):
    message: str
    region_id: str
    task_status: str = "started"
