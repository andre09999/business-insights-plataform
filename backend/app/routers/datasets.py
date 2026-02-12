from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from uuid import UUID
from pydantic import BaseModel

from ..deps import get_db
from ..models import Dataset, Record
from ..schemas import DatasetOut, SeriesPoint, KpisOut, UploadResponse
from ..services.csv_importer import parse_csv

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.get("", response_model=list[DatasetOut])
def list_datasets(db: Session = Depends(get_db)):
    query = select(Dataset).order_by(Dataset.created_at.desc())
    datasets = db.scalars(query).all()
    return datasets


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(dataset_id: UUID, db: Session = Depends(get_db)):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.get("/{dataset_id}/series", response_model=list[SeriesPoint])
def get_series(dataset_id: UUID, db: Session = Depends(get_db)):
    # garante que dataset existe
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

    # converte Decimal -> float
    return [{
        "date": r.date, "value": float(r.value or 0)
    } for r in rows]


@router.get("/{dataset_id}/kpis", response_model=KpisOut)
def get_kpis(dataset_id: UUID, db: Session = Depends(get_db)):
    dataset = db.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # total
    total = db.scalar(
        select(func.coalesce(func.sum(Record.value), 0))
        .where(Record.dataset_id == dataset_id)
    )
    total_f = float(total or 0)

    # total por dia (pra achar melhor/pior e média)
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
        # converte Decimal -> float e calcula
        daily = [{"date": r.date, "value": float(r.value)} for r in daily_rows]
        best_item = max(daily, key=lambda x: x["value"])
        worst_item = min(daily, key=lambda x: x["value"])
        best = best_item
        worst = worst_item

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


@router.get(
    "/{dataset_id}/categories", response_model=list[CategoryTotal]
)
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
        raise HTTPException(status_code=400, detail="Envie um arquivo .csv")

    content = await file.read()

    try:
        df, date_col, value_col, cat_col = parse_csv(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    ds = Dataset(
        name=f"Upload - {file.filename}",
        source_filename=file.filename,
        status="processing",
    )
    db.add(ds)
    db.flush()  # pega ds.id

    records = []
    for _, row in df.iterrows():
        records.append(
            Record(
                dataset_id=ds.id,
                event_date=row[date_col],
                category=(str(row[cat_col]) if cat_col else None),
                value=float(row[value_col]),
                quantity=None,
                meta=None,
            )
        )

    db.add_all(records)

    # atualiza dataset
    ds.row_count = len(records)
    ds.date_min = df[date_col].min()
    ds.date_max = df[date_col].max()
    ds.status = "ready"

    db.commit()

    return {"dataset_id": ds.id, "rows_inserted": len(records)}
