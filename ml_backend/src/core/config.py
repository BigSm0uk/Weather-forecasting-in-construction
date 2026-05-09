import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Weather AI Backend"
    
    # Считывается из переменных окружения (в docker-compose.yml мы задаем DATABASE_URL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://admin:password@localhost:5432/weather_ai")
    
    # Пути к хранилищам
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "/app/storage")
    DATASETS_DIR: str = os.path.join(STORAGE_DIR, "datasets")
    MODELS_DIR: str = os.path.join(STORAGE_DIR, "models")
    
    class Config:
        env_file = ".env"

settings = Settings()

# Убедимся, что директории созданы
os.makedirs(settings.DATASETS_DIR, exist_ok=True)
os.makedirs(settings.MODELS_DIR, exist_ok=True)
