import openmeteo_requests
import requests_cache
import pandas as pd
from retry_requests import retry
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import logging

logger = logging.getLogger(__name__)

cache_session = requests_cache.CachedSession('.cache', expire_after=86400)
retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
openmeteo = openmeteo_requests.Client(session=retry_session)

URL = "https://archive-api.open-meteo.com/v1/archive"


def _fetch_chunk(lat: float, lon: float, str_start: str, str_end: str) -> pd.DataFrame | None:
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": str_start,
        "end_date": str_end,
        "hourly": ["temperature_2m", "wind_speed_10m", "rain"],
        "timezone": "auto"
    }

    while True:
        try:
            responses = openmeteo.weather_api(URL, params=params)
            response = responses[0]
            hourly = response.Hourly()

            hourly_data = {"date": pd.date_range(
                start=pd.to_datetime(hourly.Time(), unit="s", utc=True),
                end=pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
                freq=pd.Timedelta(seconds=hourly.Interval()),
                inclusive="left"
            )}
            hourly_data["temperature_2m"] = hourly.Variables(0).ValuesAsNumpy()
            hourly_data["wind_speed_10m"] = hourly.Variables(1).ValuesAsNumpy()
            hourly_data["rain"] = hourly.Variables(2).ValuesAsNumpy()

            chunk_df = pd.DataFrame(data=hourly_data)
            chunk_df = chunk_df.dropna()
            return chunk_df
        except Exception as e:
            if "Minutely API request limit" in str(e):
                logger.warning(f"Rate limit on chunk {str_start}-{str_end}. Waiting 60s...")
                time.sleep(60)
            else:
                logger.error(f"Error fetching chunk {str_start} to {str_end}: {e}")
                return None


def fetch_historical_data(lat: float, lon: float, start_date: str, end_date: str) -> pd.DataFrame:
    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)

    chunks = []
    current_start = start_dt
    while current_start < end_dt:
        current_end = min(current_start + pd.DateOffset(years=5) - pd.DateOffset(days=1), end_dt)
        chunks.append((current_start.strftime("%Y-%m-%d"), current_end.strftime("%Y-%m-%d")))
        current_start = current_end + pd.DateOffset(days=1)

    logger.info(f"Fetching {len(chunks)} chunks in parallel (max_workers=2)")

    dfs = []
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {}
        for s, e in chunks:
            futures[pool.submit(_fetch_chunk, lat, lon, s, e)] = (s, e)
            time.sleep(1)
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                dfs.append(result)

    if not dfs:
        raise ValueError("Не удалось получить данные с Open-Meteo")

    final_df = pd.concat(dfs, ignore_index=True)
    final_df.set_index('date', inplace=True)
    final_df.sort_index(inplace=True)

    return final_df
