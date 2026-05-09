from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from db.session import get_db
from services.schedule_parser import parse_csv
from services.schedule_analyzer import analyze_schedule
from schemas.schedule import ScheduleAnalysisResponse

router = APIRouter()


@router.post("/analyze", response_model=ScheduleAnalysisResponse)
async def analyze_schedule_endpoint(
    region_id: str = Form(..., description="ID региона"),
    file: UploadFile = File(..., description="CSV-файл графика работ"),
    db: Session = Depends(get_db),
):
    filename = (file.filename or "").lower()
    if not filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Поддерживается только формат .csv")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Файл пуст")

    try:
        tasks, parse_warnings = parse_csv(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    response = analyze_schedule(db, region_id, tasks)
    if parse_warnings:
        response.warnings = parse_warnings + response.warnings
    return response
