from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from typing import List

from db.session import get_db
from db.models import WorkReference, Region
from core.model_manager import get_model
from services.forecast_service import get_day_forecast
from services.risk_service import evaluate_hour_risk
from schemas.forecast import ForecastOut, DayRisksOut

router = APIRouter()

@router.get("/forecast", response_model=List[ForecastOut])
def get_forecast(
    region_id: str = Query(..., description="ID региона"),
    target_date: date = Query(..., description="Дата прогноза (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    try:
        model_temp = get_model(db, region_id, "temperature")
        model_wind = get_model(db, region_id, "wind")
        model_rain = get_model(db, region_id, "rain")
    except HTTPException as e:
        raise e
        
    forecasts = get_day_forecast(target_date, model_temp, model_wind, model_rain)
    return forecasts

@router.get("/risks", response_model=List[DayRisksOut])
def get_risks(
    region_id: str = Query(..., description="ID региона"),
    target_date: date = Query(..., description="Дата прогноза (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    # Сначала получаем прогноз
    forecasts = get_forecast(region_id, target_date, db)
    
    # Получаем все виды работ из БД
    works = db.query(WorkReference).all()
    if not works:
        raise HTTPException(status_code=404, detail="Справочник работ пуст")
        
    risks_out = []
    
    for f in forecasts:
        hour = f["hour"]
        temp = f["temperature"]["value"]
        wind = f["wind_speed"]["value"]
        rain = f["precipitation"]["value"]
        
        hour_works_risk = []
        for w in works:
            risk_info = evaluate_hour_risk(w, temp, wind, rain)
            hour_works_risk.append(risk_info)
            
        risks_out.append({
            "hour": hour,
            "works": hour_works_risk
        })
        
    return risks_out
