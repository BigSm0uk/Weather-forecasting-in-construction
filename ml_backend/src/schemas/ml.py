from pydantic import BaseModel
from datetime import datetime

class ModelMetricsOut(BaseModel):
    id: int
    region_id: str
    target_type: str
    mae: float | None
    rmse: float | None
    r2_score: float | None
    training_time_sec: float
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True
