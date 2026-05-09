import pandas as pd
import numpy as np

def generate_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Добавляет временные признаки (sin/cos дня/часа, месяц, сезон), 
    как это было сделано в оригинальных ноутбуках.
    """
    # Добавляем hour и dayofyear если индекс это datetime
    hour = df.index.hour
    dayofyear = df.index.dayofyear
    month = df.index.month

    df['sin_day'] = np.sin(2 * np.pi * (dayofyear - 1) / 365.25)
    df['cos_day'] = np.cos(2 * np.pi * (dayofyear - 1) / 365.25)
    df['sin_hour'] = np.sin(2 * np.pi * hour / 24)
    df['cos_hour'] = np.cos(2 * np.pi * hour / 24)
    df['month'] = month

    # Сезон: зима=0, весна=1, лето=2, осень=3
    conditions = [
        (df['month'].isin([12, 1, 2])),
        (df['month'].isin([3, 4, 5])),
        (df['month'].isin([6, 7, 8])),
        (df['month'].isin([9, 10, 11]))
    ]
    choices = [0, 1, 2, 3]
    df['season'] = np.select(conditions, choices, default=0)

    return df
