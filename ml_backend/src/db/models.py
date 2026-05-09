from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, JSON, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from db.session import Base

class Region(Base):
    __tablename__ = "regions"

    id = Column(String, primary_key=True, index=True) # например 'spb', 'moscow'
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    datasets = relationship("Dataset", back_populates="region")
    models = relationship("TrainedModel", back_populates="region")

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(String, ForeignKey("regions.id"))
    file_path = Column(String, nullable=False) # Путь к .parquet
    num_records = Column(Integer, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    region = relationship("Region", back_populates="datasets")

class TrainedModel(Base):
    __tablename__ = "trained_models"

    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(String, ForeignKey("regions.id"))
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    target_type = Column(String, nullable=False) # 'temperature', 'wind', 'rain'

    file_path = Column(String, nullable=False) # Путь к .pkl
    training_time_sec = Column(Float, nullable=False)

    # Метрики
    mae = Column(Float, nullable=True)
    rmse = Column(Float, nullable=True)
    r2_score = Column(Float, nullable=True)

    is_default = Column(Boolean, default=True) # Использовать для предсказаний по умолчанию
    created_at = Column(DateTime, default=datetime.utcnow)

    region = relationship("Region", back_populates="models")


# Ассоциативная таблица многие-ко-многим: работа <-> климатическая группа
work_climatic_groups = Table(
    "work_climatic_groups",
    Base.metadata,
    Column("work_id", Integer, ForeignKey("work_references.id", ondelete="CASCADE"), primary_key=True),
    Column("group_id", Integer, ForeignKey("climatic_groups.id", ondelete="CASCADE"), primary_key=True),
)


class ClimaticGroup(Base):
    __tablename__ = "climatic_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    works = relationship(
        "WorkReference",
        secondary=work_climatic_groups,
        back_populates="groups",
    )


class WorkReference(Base):
    __tablename__ = "work_references"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    temp_min = Column(Float, nullable=False)
    temp_max = Column(Float, nullable=False)
    wind_max = Column(Float, nullable=False)
    rain_max = Column(Float, nullable=False)
    normative = Column(String, nullable=True)
    critical_factors = Column(JSON, nullable=True) # {'temp_below': '...', ...}

    groups = relationship(
        "ClimaticGroup",
        secondary=work_climatic_groups,
        back_populates="works",
    )
