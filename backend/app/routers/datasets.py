from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from uuid import UUID
from pydantic import BaseModel

from ..deps import get_db
from ..models import Dataset, Record, Seller
from ..schemas import (
    DatasetOut,
    SeriesPoint,
    KpisOut,
    UploadResponse,
    DatasetUpdate,
)
from ..services.csv_importer import parse_csv

router = APIRouter(prefix="/datasets", tags=["datasets"])


class SellerRankingItem(BaseModel):
    seller_id: UUID
    seller_name: str
    total_value: float
    avg_daily_value: float
    days: int


@router.get("", response_model=list[DatasetOut])
def list_datasets(db: Session = Depends(get_db)):
    query = select(Dataset).order_by(Dataset.created_at.desc())
    return db.scalars(query).all()


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(dataset_id: UUID, db: Session = Depends(get_db)):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.get("/{dataset_id}/series", response_model=list[SeriesPoint])
def get_series(dataset_id: UUID, db: Session = Depends(get_db)):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    rows = db.execute(
        select(
            Record.event_date.label("date"),
            func.sum(Record.value).label("value"),
        )
        .where(Record.dataset_id == dataset_id)
        .group_by(Record.event_date)
        .order_by(Record.event_date.asc())
    ).all()

    return [{"date": r.date, "value": float(r.value or 0)} for r in rows]


@router.get("/{dataset_id}/kpis", response_model=KpisOut)
def get_kpis(dataset_id: UUID, db: Session = Depends(get_db)):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    total = db.scalar(
        select(func.coalesce(func.sum(Record.value), 0))
        .where(Record.dataset_id == dataset_id)
    )
    total_f = float(total or 0)

    daily_rows = db.execute(
        select(
            Record.event_date.label("date"),
            func.coalesce(func.sum(Record.value), 0).label("value"),
        )
        .where(Record.dataset_id == dataset_id)
        .group_by(Record.event_date)
    ).all()

    days = len(daily_rows)
    avg_daily = (total_f / days) if days > 0 else 0.0

    best = None
    worst = None
    if days > 0:
        daily = [{"date": r.date, "value": float(r.value)} for r in daily_rows]
        best = max(daily, key=lambda x: x["value"])
        worst = min(daily, key=lambda x: x["value"])

    return {
        "total_value": total_f,
        "avg_daily_value": float(avg_daily),
        "days": days,
        "best_day": best,
        "worst_day": worst,
    }


class CategoryTotal(BaseModel):
    category: str
    value: float


@router.get("/{dataset_id}/categories", response_model=list[CategoryTotal])
def top_categories(
    dataset_id: UUID,
    limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    rows = db.execute(
        select(
            Record.category.label("category"),
            func.sum(Record.value).label("value"),
        )
        .where(Record.dataset_id == dataset_id)
        .where(Record.category.is_not(None))
        .group_by(Record.category)
        .order_by(func.sum(Record.value).desc())
        .limit(limit)
    ).all()

    return [
        {"category": r.category, "value": float(r.value or 0)}
        for r in rows
    ]


@router.post("/upload", response_model=UploadResponse)
async def upload_dataset(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400, detail="Envie um arquivo .csv"
        )

    content = await file.read()

    try:
        df, date_col, value_col, cat_col, seller_col = parse_csv(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    ds = Dataset(
        name=f"Upload - {file.filename}",
        source_filename=file.filename,
        status="processing",
    )
    db.add(ds)
    db.flush()  # pega ds.id sem commit

    # cache: seller_name -> seller_id (UUID)
    seller_cache: dict[str, UUID] = {}

    records = []
    for _, row in df.iterrows():
        seller_id = None

        if seller_col:
            raw = row[seller_col]
            seller_name = (str(raw).strip() if raw is not None else "")
            if seller_name:
                if seller_name not in seller_cache:
                    existing = db.scalar(
                        select(Seller).where(Seller.name == seller_name)
                    )
                    if not existing:
                        existing = Seller(name=seller_name, is_active=True)
                        db.add(existing)
                        db.flush()  # pega existing.id sem commit
                    seller_cache[seller_name] = existing.id
                seller_id = seller_cache[seller_name]

        records.append(
            Record(
                dataset_id=ds.id,
                seller_id=seller_id,  # ✅ vincula quando existir
                event_date=row[date_col],
                category=(str(row[cat_col]) if cat_col else None),
                value=float(row[value_col]),
                quantity=None,
                meta=None,
            )
        )

    db.add_all(records)

    ds.row_count = len(records)
    ds.date_min = df[date_col].min()
    ds.date_max = df[date_col].max()
    ds.status = "ready"

    db.commit()
    return {"dataset_id": ds.id, "rows_inserted": len(records)}


@router.patch("/{dataset_id}", response_model=DatasetOut)
def update_dataset(
    dataset_id: UUID, payload: DatasetUpdate, db: Session = Depends(get_db)
):

    ds = db.get(Dataset, dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if payload.name is not None:
        ds.name = payload.name
    if payload.status is not None:
        ds.status = payload.status

    db.commit()
    db.refresh(ds)
    return ds


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: UUID, db: Session = Depends(get_db)):
    ds = db.get(Dataset, dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    db.delete(ds)
    db.commit()
    return {"deleted": True, "dataset_id": str(dataset_id)}


@router.get(
    "/{dataset_id}/sellers/ranking",
    response_model=list[SellerRankingItem]
)
def sellers_ranking(dataset_id: UUID, db: Session = Depends(get_db)):
    # garante dataset existe
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # total por seller
    totals = db.execute(
        select(
            Seller.id.label("seller_id"),
            Seller.name.label("seller_name"),
            func.coalesce(func.sum(Record.value), 0).label("total_value"),
            func.count(func.distinct(Record.event_date)).label("days"),
        )
        .join(Record, Record.seller_id == Seller.id)
        .where(Record.dataset_id == dataset_id)
        .group_by(Seller.id, Seller.name)
        .order_by(func.coalesce(func.sum(Record.value), 0).desc())
    ).all()

    result: list[SellerRankingItem] = []
    for r in totals:
        days = int(r.days or 0)
        total = float(r.total_value or 0)
        avg_daily = (total / days) if days > 0 else 0.0

        result.append({
            "seller_id": r.seller_id,
            "seller_name": r.seller_name,
            "total_value": total,
            "avg_daily_value": float(avg_daily),
            "days": days,
        })

    return result
