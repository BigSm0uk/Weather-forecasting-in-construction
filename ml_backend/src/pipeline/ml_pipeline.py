import os
import time
import joblib
import pandas as pd
from datetime import datetime, timedelta
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import logging
import warnings

# Подавляем FutureWarning от pandas (вызывается внутри xgboost)
warnings.filterwarnings("ignore", category=FutureWarning)

from db.session import SessionLocal
from db.models import Dataset, TrainedModel
from core.config import settings
from pipeline.openmeteo import fetch_historical_data
from pipeline.preprocess import generate_features

logger = logging.getLogger(__name__)

def run_pipeline(region_id: str, lat: float, lon: float, incremental: bool = True):
    logger.info(f"Starting ML pipeline for region {region_id} ({lat}, {lon}) incremental={incremental}")

    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = "1940-01-01"

    parquet_path = os.path.join(settings.DATASETS_DIR, f"dataset_{region_id}.parquet")
    existing_df = None

    db = SessionLocal()
    try:
        if incremental:
            last_dataset = (
                db.query(Dataset)
                .filter(Dataset.region_id == region_id)
                .order_by(Dataset.created_at.desc())
                .first()
            )
            if last_dataset and os.path.exists(last_dataset.file_path):
                logger.info(f"Loading existing dataset from {last_dataset.file_path}")
                existing_df = pd.read_parquet(last_dataset.file_path, engine='pyarrow')
                if not existing_df.empty:
                    max_date = existing_df.index.max()
                    new_start = (max_date + pd.Timedelta(days=1)).strftime("%Y-%m-%d")
                    if new_start <= end_date:
                        start_date = new_start
                        logger.info(f"Incremental fetch from {start_date} to {end_date}")
                    else:
                        logger.info("Dataset already up-to-date; skipping fetch.")
                        start_date = None
            else:
                logger.warning("Incremental requested but no prior dataset found. Doing full download.")

        # 2. Загружаем данные (только если нужно)
        if start_date is not None:
            logger.info("Fetching data from Open-Meteo...")
            new_df = fetch_historical_data(lat, lon, start_date, end_date)
            new_df = generate_features(new_df)
        else:
            new_df = pd.DataFrame()

        # 3. Объединяем с существующим датасетом, если инкрементально
        if existing_df is not None and not new_df.empty:
            df = pd.concat([existing_df, new_df])
            df = df[~df.index.duplicated(keep='last')]
            df.sort_index(inplace=True)
        elif existing_df is not None:
            df = existing_df
        else:
            df = new_df

        if df.empty:
            logger.error("No data available to train on.")
            return

        # 4. Сохранение датасета в Parquet
        df.to_parquet(parquet_path, engine='pyarrow')
        file_size = os.path.getsize(parquet_path)

        dataset_entry = Dataset(
            region_id=region_id,
            file_path=parquet_path,
            num_records=len(df),
            file_size_bytes=file_size
        )
        db.add(dataset_entry)
        db.commit()
        db.refresh(dataset_entry)

        # 5. Обучение моделей
        feature_cols = ['sin_day', 'cos_day', 'sin_hour', 'cos_hour', 'month', 'season']

        # Разбиваем на train/test (последние 10 лет - тест)
        train_mask = df.index < (df.index.max() - pd.DateOffset(years=10))
        X_train = df.loc[train_mask, feature_cols]
        X_test = df.loc[~train_mask, feature_cols]

        targets = {
            'temperature': 'temperature_2m',
            'wind': 'wind_speed_10m',
            'rain': 'rain'
        }

        for tgt_name, tgt_col in targets.items():
            logger.info(f"Training XGBoost for {tgt_name}...")
            y_train = df.loc[train_mask, tgt_col]
            y_test = df.loc[~train_mask, tgt_col]

            start_time = time.time()
            model = XGBRegressor(n_estimators=200, max_depth=6, learning_rate=0.05, random_state=42)
            model.fit(X_train, y_train)
            training_time = time.time() - start_time

            # Оценка
            preds = model.predict(X_test)
            mae = float(mean_absolute_error(y_test, preds))
            rmse = float(mean_squared_error(y_test, preds, squared=False))
            r2 = float(r2_score(y_test, preds))

            # Сброс флага is_default для старых моделей этого типа и региона
            old_models = db.query(TrainedModel).filter(
                TrainedModel.region_id == region_id,
                TrainedModel.target_type == tgt_name,
                TrainedModel.is_default == True
            ).all()
            for om in old_models:
                om.is_default = False

            # Сохранение файла
            timestamp = int(time.time())
            pkl_filename = f"xgb_{region_id}_{tgt_name}_{timestamp}.pkl"
            pkl_path = os.path.join(settings.MODELS_DIR, pkl_filename)
            joblib.dump(model, pkl_path)

            # Запись метаданных обученной модели
            trained_model_entry = TrainedModel(
                region_id=region_id,
                dataset_id=dataset_entry.id,
                target_type=tgt_name,
                file_path=pkl_path,
                training_time_sec=training_time,
                mae=mae,
                rmse=rmse,
                r2_score=r2,
                is_default=True
            )
            db.add(trained_model_entry)

        db.commit()
        logger.info(f"Pipeline for {region_id} finished successfully.")
    except Exception as e:
        logger.error(f"Error in pipeline: {e}")
        db.rollback()
    finally:
        db.close()
