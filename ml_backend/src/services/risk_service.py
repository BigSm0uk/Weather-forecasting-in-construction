from typing import List, Dict
from db.models import WorkReference

RAIN_EPSILON = 0.1

def evaluate_hour_risk(work: WorkReference, temp: float, wind: float, rain: float) -> Dict:
    status = "low"
    reasons = []
    
    # Факторы (могут быть пустыми если в БД null)
    factors = work.critical_factors or {}
    msg_temp_below = factors.get('temp_below', f"Температура ниже {work.temp_min}°C")
    msg_temp_above = factors.get('temp_above', f"Температура выше {work.temp_max}°C")
    msg_wind_above = factors.get('wind_above', f"Ветер > {work.wind_max} м/с")
    msg_rain_above = factors.get('rain_above', f"Осадки > {work.rain_max} мм/ч")

    if temp < work.temp_min:
        status = "high"
        reasons.append(msg_temp_below)
    elif temp > work.temp_max:
        status = "high"
        reasons.append(msg_temp_above)
        
    if wind > work.wind_max:
        status = "high"
        reasons.append(msg_wind_above)
        
    if rain > work.rain_max + RAIN_EPSILON:
        status = "high"
        reasons.append(msg_rain_above)
        
    if status == "low":
        if abs(temp - work.temp_min) <= 2:
            status = "moderate"
            reasons.append(f"Температура близка к нижней границе ({work.temp_min}°C)")
        elif abs(temp - work.temp_max) <= 2:
            status = "moderate"
            reasons.append(f"Температура близка к верхней границе ({work.temp_max}°C)")
        elif abs(wind - work.wind_max) <= 1:
            status = "moderate"
            reasons.append(f"Скорость ветра близка к предельной ({work.wind_max} м/с)")
        elif rain > RAIN_EPSILON and work.rain_max == 0:
            status = "moderate"
            reasons.append("Даже слабые осадки нежелательны")
            
    return {
        "work_id": work.id,
        "work_name": work.name,
        "status": status,
        "reasons": reasons,
        "normative": work.normative
    }
