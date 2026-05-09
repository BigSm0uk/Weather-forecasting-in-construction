import pandas as pd
import numpy as np
from datetime import datetime, date
from typing import List, Dict

def generate_features_for_hour(target_date: date, hour: int) -> pd.DataFrame:
    """Генерирует фичи ровно для 1 часа как это делалось при обучении"""
    # Сначала преобразуем в datetime чтобы забрать свойства
    dt = datetime.combine(target_date, datetime.min.time())
    
    dayofyear = dt.timetuple().tm_yday
    month = dt.month
    
    sin_day = np.sin(2 * np.pi * (dayofyear - 1) / 365.25)
    cos_day = np.cos(2 * np.pi * (dayofyear - 1) / 365.25)
    sin_hour = np.sin(2 * np.pi * hour / 24)
    cos_hour = np.cos(2 * np.pi * hour / 24)
    
    if month in [12, 1, 2]:
        season = 0
    elif month in [3, 4, 5]:
        season = 1
    elif month in [6, 7, 8]:
        season = 2
    else:
        season = 3
        
    features = {
        'sin_day': [sin_day],
        'cos_day': [cos_day],
        'sin_hour': [sin_hour],
        'cos_hour': [cos_hour],
        'month': [month],
        'season': [season]
    }
    return pd.DataFrame(features)

def get_day_forecast(
    target_date: date, 
    model_temp, model_wind, model_rain
) -> List[Dict]:
    forecast = []
    
    for hour in range(24):
        features = generate_features_for_hour(target_date, hour)
        
        # predict возвращает numpy array, берем первый элемент
        temp = float(model_temp.predict(features)[0])
        wind = float(model_wind.predict(features)[0])
        rain = float(max(0, model_rain.predict(features)[0])) # Осадки не могут быть < 0
        
        forecast.append({
            "hour": hour,
            "temperature": {"value": round(temp, 1)},
            "wind_speed": {"value": round(wind, 1)},
            "precipitation": {"value": round(rain, 1)}
        })
        
    return forecast
