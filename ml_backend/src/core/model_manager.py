import joblib
from sqlalchemy.orm import Session
from fastapi import HTTPException
import logging

from db.models import TrainedModel

logger = logging.getLogger(__name__)

# Кэш моделей в ОЗУ: (region_id, target_type) -> (model, db_model_id)
_model_cache = {}

def get_model(db: Session, region_id: str, target_type: str):
    """
    Возвращает загруженную модель (XGBoost).
    Если она уже в кэше и ID актуальной модели совпадает, возвращаем из кэша.
    """
    # Ищем дефолтную модель в БД
    db_model = db.query(TrainedModel).filter(
        TrainedModel.region_id == region_id,
        TrainedModel.target_type == target_type,
        TrainedModel.is_default == True
    ).first()
    
    if not db_model:
        raise HTTPException(status_code=404, detail=f"No active model found for region {region_id} and target {target_type}")
    
    cache_key = (region_id, target_type)
    
    if cache_key in _model_cache:
        cached_model, cached_id = _model_cache[cache_key]
        if cached_id == db_model.id:
            return cached_model
            
    # Загружаем с диска
    logger.info(f"Loading model {db_model.file_path} from disk for {target_type} in {region_id}")
    try:
        loaded_model = joblib.load(db_model.file_path)
        _model_cache[cache_key] = (loaded_model, db_model.id)
        return loaded_model
    except Exception as e:
        logger.error(f"Failed to load model {db_model.file_path}: {e}")
        raise HTTPException(status_code=500, detail="Failed to load model file from storage")
