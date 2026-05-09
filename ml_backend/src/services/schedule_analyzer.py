from datetime import timedelta, date
from typing import Dict, List, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException

from db.models import WorkReference
from core.model_manager import get_model
from services.forecast_service import get_day_forecast
from services.risk_service import evaluate_hour_risk
from schemas.schedule import (
    ParsedTask,
    HourDetail,
    TaskAnalysisDay,
    TaskAnalysisResult,
    ScheduleAnalysisResponse,
)


STATUS_RANK = {"low": 0, "moderate": 1, "high": 2}


def _aggregate_day_status(hourly_results: List[Dict]) -> Tuple[str, List[str]]:
    """Сворачивает 24 почасовых результата в один статус для дня."""
    worst = "low"
    reasons: List[str] = []
    seen = set()
    for r in hourly_results:
        st = r["status"]
        if STATUS_RANK[st] > STATUS_RANK[worst]:
            worst = st
        # Собираем уникальные причины (только те, что соответствуют worst и выше)
        for reason in r.get("reasons", []):
            if reason not in seen:
                seen.add(reason)
                reasons.append(reason)
    # Если статус low — причин не показываем
    if worst == "low":
        return worst, []
    return worst, reasons


def analyze_schedule(
    db: Session,
    region_id: str,
    tasks: List[ParsedTask],
) -> ScheduleAnalysisResponse:
    if not tasks:
        raise HTTPException(status_code=400, detail="Список задач пуст")

    # Загружаем модели региона один раз
    try:
        model_temp = get_model(db, region_id, "temperature")
        model_wind = get_model(db, region_id, "wind")
        model_rain = get_model(db, region_id, "rain")
    except HTTPException:
        raise

    # Собираем все уникальные work_id и подгружаем справочник
    work_ids = {t.work_id for t in tasks}
    works_map: Dict[int, WorkReference] = {
        w.id: w for w in db.query(WorkReference).filter(WorkReference.id.in_(work_ids)).all()
    }

    warnings: List[str] = []
    missing_ids = work_ids - set(works_map.keys())
    if missing_ids:
        warnings.append(
            f"В справочнике не найдены Work Type ID: {sorted(missing_ids)}. "
            f"Задачи с этими ID будут пропущены."
        )

    # Кэш прогнозов по дате
    forecast_cache: Dict[date, List[Dict]] = {}

    def _forecast_for(d: date) -> List[Dict]:
        if d not in forecast_cache:
            forecast_cache[d] = get_day_forecast(d, model_temp, model_wind, model_rain)
        return forecast_cache[d]

    results: List[TaskAnalysisResult] = []
    min_date = min(t.start_date for t in tasks)
    max_date = max(t.end_date for t in tasks)

    for task in tasks:
        work = works_map.get(task.work_id)
        if work is None:
            continue

        days: List[TaskAnalysisDay] = []
        current = task.start_date
        while current <= task.end_date:
            forecast = _forecast_for(current)
            hourly = [
                evaluate_hour_risk(
                    work,
                    f["temperature"]["value"],
                    f["wind_speed"]["value"],
                    f["precipitation"]["value"],
                )
                for f in forecast
            ]
            status, reasons = _aggregate_day_status(hourly)
            hour_details = [
                HourDetail(
                    hour=f["hour"],
                    temperature=f["temperature"]["value"],
                    wind_speed=f["wind_speed"]["value"],
                    precipitation=f["precipitation"]["value"],
                    status=h["status"],
                    reasons=h.get("reasons", []),
                )
                for f, h in zip(forecast, hourly)
            ]
            days.append(TaskAnalysisDay(date=current, status=status, reasons=reasons, hours=hour_details))
            current += timedelta(days=1)

        results.append(TaskAnalysisResult(
            task_name=task.task_name,
            work_id=work.id,
            work_name=work.name,
            start_date=task.start_date,
            end_date=task.end_date,
            days=days,
        ))

    return ScheduleAnalysisResponse(
        region_id=region_id,
        min_date=min_date,
        max_date=max_date,
        tasks=results,
        warnings=warnings,
    )
