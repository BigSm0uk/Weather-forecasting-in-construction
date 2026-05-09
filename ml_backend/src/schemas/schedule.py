from pydantic import BaseModel
from typing import List, Optional
from datetime import date


class HourDetail(BaseModel):
    hour: int
    temperature: float
    wind_speed: float
    precipitation: float
    status: str
    reasons: List[str] = []


class TaskAnalysisDay(BaseModel):
    date: date
    status: str  # 'low' | 'moderate' | 'high'
    reasons: List[str] = []
    hours: List[HourDetail] = []


class TaskAnalysisResult(BaseModel):
    task_name: str
    work_id: int
    work_name: str
    start_date: date
    end_date: date
    days: List[TaskAnalysisDay]


class ScheduleAnalysisResponse(BaseModel):
    region_id: str
    min_date: date
    max_date: date
    tasks: List[TaskAnalysisResult]
    warnings: List[str] = []


class ParsedTask(BaseModel):
    task_name: str
    work_id: int
    start_date: date
    end_date: date
