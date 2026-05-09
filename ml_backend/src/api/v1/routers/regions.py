from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from typing import List

from db.session import get_db
from db.models import Region
from schemas.region import RegionOut, TrainRegionRequest, TrainRegionResponse
from pipeline.ml_pipeline import run_pipeline

router = APIRouter()

@router.get("/", response_model=List[RegionOut])
def get_regions(db: Session = Depends(get_db)):
    regions = db.query(Region).all()
    return regions

@router.post("/train", response_model=TrainRegionResponse)
def train_region(request: TrainRegionRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Проверяем, существует ли регион
    region = db.query(Region).filter(Region.id == request.id).first()
    if not region:
        region = Region(
            id=request.id,
            name=request.name,
            latitude=request.latitude,
            longitude=request.longitude
        )
        db.add(region)
        db.commit()
    else:
        # Обновляем координаты, если поменялись
        region.latitude = request.latitude
        region.longitude = request.longitude
        db.commit()

    # Запуск фоновой задачи pipeline (скачивание данных + предпроцессинг + обучение)
    background_tasks.add_task(run_pipeline, request.id, request.latitude, request.longitude, request.incremental)
    
    return TrainRegionResponse(
        message=f"Training pipeline for region {request.name} started in background.",
        region_id=request.id
    )
