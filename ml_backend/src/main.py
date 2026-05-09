from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from db.session import engine
from db.models import Base
from db.seed import run_seed

# Инициализация таблиц БД (создаём только если не существуют)
Base.metadata.create_all(bind=engine)

# Сидирование захардкоженных групп и справочника работ из mock_data.json
run_seed()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Weather Risks System API",
    description="API для прогнозирования метеорисков на строительных площадках на основе ML.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # для разработки
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Weather Risks API. See /docs for documentation."}

from api.v1.routers import reference, regions, risks, schedule

app.include_router(reference.router, prefix="/api/v1/reference/works", tags=["Reference"])
app.include_router(regions.router, prefix="/api/v1/regions", tags=["Regions & MLOps"])
app.include_router(risks.router, prefix="/api/v1", tags=["Forecast & Risks"])
app.include_router(schedule.router, prefix="/api/v1/schedule", tags=["Schedule Analysis"])
