from pydantic import BaseModel
from typing import Dict, Any, List
from datetime import date

class ForecastValue(BaseModel):
    value: float

class ForecastOut(BaseModel):
    hour: int
    temperature: ForecastValue
    wind_speed: ForecastValue
    precipitation: ForecastValue

class RiskWork(BaseModel):
    work_id: int
    work_name: str
    status: str # 'low', 'moderate', 'high'
    reasons: List[str]
    normative: str | None

class DayRisksOut(BaseModel):
    hour: int
    works: List[RiskWork]
