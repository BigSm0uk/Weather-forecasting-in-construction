from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from db.session import get_db
from db.models import WorkReference, ClimaticGroup
from schemas.reference import (
    WorkReferenceCreate,
    WorkReferenceUpdate,
    WorkReferenceOut,
    ClimaticGroupOut,
)

router = APIRouter()


def _resolve_groups(db: Session, group_ids: List[int]) -> List[ClimaticGroup]:
    if not group_ids:
        return []
    groups = db.query(ClimaticGroup).filter(ClimaticGroup.id.in_(group_ids)).all()
    found_ids = {g.id for g in groups}
    missing = [gid for gid in group_ids if gid not in found_ids]
    if missing:
        raise HTTPException(status_code=400, detail=f"Climatic groups not found: {missing}")
    return groups


@router.get("/groups/", response_model=List[ClimaticGroupOut])
def get_groups(db: Session = Depends(get_db)):
    return db.query(ClimaticGroup).order_by(ClimaticGroup.id).all()


@router.get("/", response_model=List[WorkReferenceOut])
def get_works(db: Session = Depends(get_db)):
    works = db.query(WorkReference).all()
    return works


@router.post("/", response_model=WorkReferenceOut, status_code=201)
def create_work(work_in: WorkReferenceCreate, db: Session = Depends(get_db)):
    # Проверка на дубликат
    db_work = db.query(WorkReference).filter(WorkReference.name == work_in.name).first()
    if db_work:
        raise HTTPException(status_code=400, detail="Work with this name already exists")

    payload = work_in.model_dump(exclude={"group_ids"})
    new_work = WorkReference(**payload)
    new_work.groups = _resolve_groups(db, work_in.group_ids)
    db.add(new_work)
    db.commit()
    db.refresh(new_work)
    return new_work


@router.put("/{work_id}", response_model=WorkReferenceOut)
def update_work(work_id: int, work_in: WorkReferenceUpdate, db: Session = Depends(get_db)):
    db_work = db.query(WorkReference).filter(WorkReference.id == work_id).first()
    if not db_work:
        raise HTTPException(status_code=404, detail="Work not found")

    update_data = work_in.model_dump(exclude_unset=True)
    group_ids = update_data.pop("group_ids", None)
    for key, value in update_data.items():
        setattr(db_work, key, value)

    if group_ids is not None:
        db_work.groups = _resolve_groups(db, group_ids)

    db.commit()
    db.refresh(db_work)
    return db_work


@router.delete("/{work_id}", status_code=204)
def delete_work(work_id: int, db: Session = Depends(get_db)):
    db_work = db.query(WorkReference).filter(WorkReference.id == work_id).first()
    if not db_work:
        raise HTTPException(status_code=404, detail="Work not found")

    db.delete(db_work)
    db.commit()
    return None
