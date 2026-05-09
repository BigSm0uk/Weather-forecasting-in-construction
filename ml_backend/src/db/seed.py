"""Сидирование начальных данных в БД при старте приложения.

- Захардкоженный список климатических групп (`ClimaticGroup`).
- Импорт справочника работ из `mock_data.json` с привязкой к группам по эвристике.
"""
import json
import logging
from pathlib import Path
from typing import Dict, List

from sqlalchemy.orm import Session

from db.session import SessionLocal
from db.models import ClimaticGroup, WorkReference

logger = logging.getLogger(__name__)

# Захардкоженные группы климатических проявлений
HARDCODED_GROUPS: List[str] = [
    "Температурные ограничения",
    "Осадки",
    "Ветровые",
]

MOCK_DATA_PATH = Path(__file__).parent / "mock_data.json"


def _classify_groups(work: dict, name_to_group: Dict[str, ClimaticGroup]) -> List[ClimaticGroup]:
    """Эвристическая классификация работы по группам на основе её ограничений."""
    groups: List[ClimaticGroup] = []
    cf = work.get("critical_factors") or {}

    # Температура: если задан содержательный диапазон
    if work.get("temp_min", -1000) > -50 or work.get("temp_max", 1000) < 60:
        groups.append(name_to_group["Температурные ограничения"])

    # Осадки: rain_max < 100 (то есть есть ограничение) или явно упомянуты в critical_factors
    if work.get("rain_max", 100.0) < 50.0 or "rain_above" in cf:
        groups.append(name_to_group["Осадки"])

    # Ветер: wind_max < 50 (т.е. есть ограничение)
    if work.get("wind_max", 50.0) < 30.0:
        groups.append(name_to_group["Ветровые"])

    return groups


def seed_climatic_groups(db: Session) -> Dict[str, ClimaticGroup]:
    """Гарантирует наличие всех захардкоженных групп в БД."""
    existing = {g.name: g for g in db.query(ClimaticGroup).all()}
    for name in HARDCODED_GROUPS:
        if name not in existing:
            grp = ClimaticGroup(name=name)
            db.add(grp)
            existing[name] = grp
    db.commit()
    return {name: db.query(ClimaticGroup).filter(ClimaticGroup.name == name).first()
            for name in HARDCODED_GROUPS}


def seed_work_references(db: Session, name_to_group: Dict[str, ClimaticGroup]) -> None:
    """Импорт работ из mock_data.json, если справочник пуст."""
    if db.query(WorkReference).count() > 0:
        return

    if not MOCK_DATA_PATH.exists():
        logger.warning("mock_data.json not found at %s", MOCK_DATA_PATH)
        return

    with open(MOCK_DATA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data:
        work = WorkReference(
            name=item["name"],
            temp_min=item["temp_min"],
            temp_max=item["temp_max"],
            wind_max=item["wind_max"],
            rain_max=item["rain_max"],
            normative=item.get("normative"),
            critical_factors=item.get("critical_factors") or {},
        )
        work.groups = _classify_groups(item, name_to_group)
        db.add(work)

    db.commit()
    logger.info("Seeded %d work references from mock_data.json", len(data))


def run_seed() -> None:
    db = SessionLocal()
    try:
        name_to_group = seed_climatic_groups(db)
        seed_work_references(db, name_to_group)
    finally:
        db.close()
