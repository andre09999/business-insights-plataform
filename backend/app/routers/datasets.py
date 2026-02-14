from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from uuid import UUID
from pydantic import BaseModel
from datetime import date, timedelta
import csv
from io import StringIO
from fastapi.responses import StreamingResponse


from ..deps import get_db
from ..models import Dataset, Record, Seller
from ..schemas import (
    DatasetOut, SeriesPoint, KpisOut, UploadResponse, DatasetUpdate,
    DashboardOut, TopCategoryOut, SellerRankingItem, DatasetSellerOut,
    FiltersOut, FilterSellerOut, DashboardCompareOut
)

from ..services.csv_importer import parse_csv

router = APIRouter(prefix="/datasets", tags=["datasets"])


class CategoryTotal(BaseModel):
    category: str
    value: float


def ensure_dataset(db: Session, dataset_id: UUID) -> Dataset:
    ds = db.get(Dataset, dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return ds


def get_or_create_seller(db: Session, seller_name: str) -> Seller:
    name = seller_name.strip()
    if not name:
        raise ValueError("Empty seller name")

    existing = db.scalar(select(Seller).where(Seller.name == name))
    if existing:
        return existing

    seller = Seller(name=name, region=None, is_active=True)
    db.add(seller)
    db.flush()  # pega seller.id sem commit
    return seller


def _build_dashboard(
    db: Session,
    dataset_id: UUID,
    start_date: date | None,
    end_date: date | None,
    seller_id: UUID | None,
    categories_limit: int,
    ranking_limit: int,
) -> dict:
    filters = _record_filters(dataset_id, start_date, end_date, seller_id)

    # SERIES
    series_rows = db.execute(
        select(
            Record.event_date.label("date"),
            func.coalesce(func.sum(Record.value), 0).label("value"),
        )
        .where(*filters)
        .group_by(Record.event_date)
        .order_by(Record.event_date.asc())
    ).all()

    series = [
        {"date": r.date, "value": float(r.value or 0)}
        for r in series_rows
    ]

    # KPIS
    total = db.scalar(
        select(func.coalesce(func.sum(Record.value), 0)).where(*filters)
    )
    total_f = float(total or 0)

    days = len(series_rows)
    avg_daily = (total_f / days) if days > 0 else 0.0

    best = None
    worst = None
    if days > 0:
        best = max(series, key=lambda x: x["value"])
        worst = min(series, key=lambda x: x["value"])

    kpis = {
        "total_value": total_f,
        "avg_daily_value": float(avg_daily),
        "days": days,
        "best_day": best,
        "worst_day": worst,
    }

    # TOP CATEGORIES
    cat_rows = db.execute(
        select(
            Record.category.label("category"),
            func.coalesce(func.sum(Record.value), 0).label("value"),
        )
        .where(*filters)
        .where(Record.category.is_not(None))
        .group_by(Record.category)
        .order_by(func.sum(Record.value).desc())
        .limit(categories_limit)
    ).all()

    top_categories = [
        {"category": r.category, "value": float(r.value or 0)}
        for r in cat_rows
    ]
    # SELLER RANKING
    rank_rows = db.execute(
        select(
            Seller.id.label("seller_id"),
            Seller.name.label("seller_name"),
            func.coalesce(func.sum(Record.value), 0).label("total_value"),
            func.count(func.distinct(Record.event_date)).label("days"),
        )
        .join(Record, Record.seller_id == Seller.id)
        .where(*filters)
        .group_by(Seller.id, Seller.name)
        .order_by(func.coalesce(func.sum(Record.value), 0).desc())
        .limit(ranking_limit)
    ).all()

    seller_ranking: list[SellerRankingItem] = []
    for r in rank_rows:
        d = int(r.days or 0)
        t = float(r.total_value or 0)
        seller_ranking.append(
            {
                "seller_id": r.seller_id,
                "seller_name": r.seller_name,
                "total_value": t,
                "avg_daily_value": float(t / d) if d > 0 else 0.0,
                "days": d,
            }
        )

    return {
        "kpis": kpis,
        "series": series,
        "top_categories": top_categories,
        "seller_ranking": seller_ranking,
    }


# ----------------------------
# Datasets: read
# ----------------------------
@router.get("", response_model=list[DatasetOut])
def list_datasets(db: Session = Depends(get_db)):
    stmt = select(Dataset).order_by(Dataset.created_at.desc())
    return db.scalars(stmt).all()


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(dataset_id: UUID, db: Session = Depends(get_db)):
    return ensure_dataset(db, dataset_id)


@router.get("/{dataset_id}/filters", response_model=FiltersOut)
def get_filters(
    dataset_id: UUID,
    db: Session = Depends(get_db),
):
    ds = ensure_dataset(db, dataset_id)

    # categorias distintas do dataset
    cat_rows = db.execute(
        select(Record.category)
        .where(Record.dataset_id == dataset_id)
        .where(Record.category.is_not(None))
        .distinct()
        .order_by(Record.category.asc())
    ).all()
    categories = [r[0] for r in cat_rows if r[0] is not None]

    # sellers distintos do dataset
    seller_rows = db.execute(
        select(Seller.id, Seller.name)
        .join(Record, Record.seller_id == Seller.id)
        .where(Record.dataset_id == dataset_id)
        .distinct()
        .order_by(Seller.name.asc())
    ).all()

    return FiltersOut(
        date_min=ds.date_min,
        date_max=ds.date_max,
        categories=categories,
        sellers=[
            FilterSellerOut(
                seller_id=r[0],
                seller_name=r[1]
            )
            for r in seller_rows
        ]
    )


@router.get("/{dataset_id}/series", response_model=list[SeriesPoint])
def get_series(
    dataset_id: UUID,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    seller_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
):
    ds = ensure_dataset(db, dataset_id)
    start_date, end_date = _normalize_date_filters(ds, start_date, end_date)

    filters = _record_filters(dataset_id, start_date, end_date, seller_id)

    rows = db.execute(
        select(
            Record.event_date.label("date"),
            func.coalesce(func.sum(Record.value), 0).label("value"),
        )
        .where(*filters)
        .group_by(Record.event_date)
        .order_by(Record.event_date.asc())
    ).all()

    return [{"date": r.date, "value": float(r.value or 0)} for r in rows]


@router.get("/{dataset_id}/kpis", response_model=KpisOut)
def get_kpis(
    dataset_id: UUID,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    seller_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
):
    ds = ensure_dataset(db, dataset_id)
    start_date, end_date = _normalize_date_filters(ds, start_date, end_date)

    filters = _record_filters(dataset_id, start_date, end_date, seller_id)

    total = db.scalar(
        select(func.coalesce(func.sum(Record.value), 0))
        .where(*filters)
    )
    total_f = float(total or 0)

    daily_rows = db.execute(
        select(
            Record.event_date.label("date"),
            func.coalesce(func.sum(Record.value), 0).label("value"),
        )
        .where(*filters)
        .group_by(Record.event_date)
    ).all()

    days = len(daily_rows)
    avg_daily = (total_f / days) if days > 0 else 0.0

    best = None
    worst = None
    if days > 0:
        daily = [
            {"date": r.date, "value": float(r.value or 0)}
            for r in daily_rows
        ]
        best = max(daily, key=lambda x: x["value"])
        worst = min(daily, key=lambda x: x["value"])

    return {
        "total_value": total_f,
        "avg_daily_value": float(avg_daily),
        "days": days,
        "best_day": best,
        "worst_day": worst,
    }


@router.get("/{dataset_id}/categories", response_model=list[TopCategoryOut])
def top_categories(
    dataset_id: UUID,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    seller_id: UUID | None = Query(default=None),
    limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
):
    ds = ensure_dataset(db, dataset_id)
    start_date, end_date = _normalize_date_filters(ds, start_date, end_date)

    filters = _record_filters(dataset_id, start_date, end_date, seller_id)

    rows = db.execute(
        select(
            Record.category.label("category"),
            func.coalesce(func.sum(Record.value), 0).label("value"),
        )
        .where(*filters)
        .where(Record.category.is_not(None))
        .group_by(Record.category)
        .order_by(func.sum(Record.value).desc())
        .limit(limit)
    ).all()

    return [
        {"category": r.category, "value": float(r.value or 0)}
        for r in rows
    ]


# ----------------------------
# Upload
# ----------------------------
@router.post("/upload", response_model=UploadResponse)
async def upload_dataset(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Envie um arquivo .csv")

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
    db.flush()

    seller_cache: dict[str, UUID] = {}
    records: list[Record] = []

    for _, row in df.iterrows():
        seller_id = None

        if seller_col:
            raw = row.get(seller_col)
            seller_name = (str(raw).strip() if raw is not None else "")
            if seller_name:
                if seller_name not in seller_cache:
                    seller = get_or_create_seller(db, seller_name)
                    seller_cache[seller_name] = seller.id
                seller_id = seller_cache[seller_name]

        records.append(
            Record(
                dataset_id=ds.id,
                seller_id=seller_id,
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


# ----------------------------
# Update/Delete
# ----------------------------
@router.patch("/{dataset_id}", response_model=DatasetOut)
def update_dataset(
    dataset_id: UUID, payload: DatasetUpdate, db: Session = Depends(get_db)
):
    ds = ensure_dataset(db, dataset_id)

    if payload.name is not None:
        ds.name = payload.name
    if payload.status is not None:
        ds.status = payload.status

    db.commit()
    db.refresh(ds)
    return ds


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: UUID, db: Session = Depends(get_db)):
    ds = ensure_dataset(db, dataset_id)

    db.delete(ds)
    db.commit()
    return {"deleted": True, "dataset_id": str(dataset_id)}


@router.get("/{dataset_id}/sellers", response_model=list[DatasetSellerOut])
def list_dataset_sellers(
    dataset_id: UUID,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    ds = ensure_dataset(db, dataset_id)
    start_date, end_date = _normalize_date_filters(ds, start_date, end_date)

    # sellers existentes no dataset (filtrável por período)
    filters = _record_filters(dataset_id, start_date, end_date, seller_id=None)

    rows = db.execute(
        select(
            Seller.id.label("seller_id"),
            Seller.name.label("seller_name"),
            func.coalesce(func.sum(Record.value), 0).label("total_value"),
            func.count(func.distinct(Record.event_date)).label("days"),
        )
        .join(Record, Record.seller_id == Seller.id)
        .where(*filters)
        .group_by(Seller.id, Seller.name)
        .order_by(Seller.name.asc())
    ).all()

    return [
        {
            "seller_id": r.seller_id,
            "seller_name": r.seller_name,
            "total_value": float(r.total_value or 0),
            "days": int(r.days or 0),
        }
        for r in rows
    ]


# ----------------------------
# Sellers ranking
# ----------------------------
@router.get(
    "/{dataset_id}/sellers/ranking",
    response_model=list[SellerRankingItem]
)
def sellers_ranking(
    dataset_id: UUID,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    seller_id: UUID | None = Query(default=None),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    ds = ensure_dataset(db, dataset_id)
    start_date, end_date = _normalize_date_filters(ds, start_date, end_date)

    filters = _record_filters(dataset_id, start_date, end_date, seller_id)

    totals = db.execute(
        select(
            Seller.id.label("seller_id"),
            Seller.name.label("seller_name"),
            func.coalesce(func.sum(Record.value), 0).label("total_value"),
            func.count(func.distinct(Record.event_date)).label("days"),
        )
        .join(Record, Record.seller_id == Seller.id)
        .where(*filters)
        .group_by(Seller.id, Seller.name)
        .order_by(func.coalesce(func.sum(Record.value), 0).desc())
        .limit(limit)
    ).all()

    result: list[SellerRankingItem] = []
    for r in totals:
        days = int(r.days or 0)
        total = float(r.total_value or 0)
        avg_daily = (total / days) if days > 0 else 0.0

        result.append(
            {
                "seller_id": r.seller_id,
                "seller_name": r.seller_name,
                "total_value": total,
                "avg_daily_value": float(avg_daily),
                "days": days,
            }
        )

    return result


def _normalize_date_filters(
    ds: Dataset,
    start_date: date | None,
    end_date: date | None,
):
    """
    Normaliza filtros de datas:
    - se vier só start_date, completa end_date com ds.date_max
    - se vier só end_date, completa start_date com ds.date_min
    - valida start_date <= end_date
    """
    if start_date is not None and end_date is None:
        end_date = ds.date_max
    elif end_date is not None and start_date is None:
        start_date = ds.date_min

    if (
        start_date is not None
        and end_date is not None
        and start_date > end_date
    ):
        raise HTTPException(
            status_code=422,
            detail="start_date não pode ser maior que end_date",
        )

    return start_date, end_date


def _record_filters(
    dataset_id: UUID,
    start_date: date | None,
    end_date: date | None,
    seller_id: UUID | None,
):
    filters = [Record.dataset_id == dataset_id]

    if start_date is not None:
        filters.append(Record.event_date >= start_date)

    if end_date is not None:
        filters.append(Record.event_date <= end_date)

    if seller_id is not None:
        filters.append(Record.seller_id == seller_id)

    return filters


@router.get("/{dataset_id}/dashboard", response_model=DashboardOut)
def get_dashboard(
    dataset_id: UUID,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    seller_id: UUID | None = Query(default=None),
    categories_limit: int = Query(5, ge=1, le=50),
    ranking_limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    ds = ensure_dataset(db, dataset_id)
    start_date, end_date = _normalize_date_filters(ds, start_date, end_date)

    return _build_dashboard(
        db=db,
        dataset_id=dataset_id,
        start_date=start_date,
        end_date=end_date,
        seller_id=seller_id,
        categories_limit=categories_limit,
        ranking_limit=ranking_limit,
    )


@router.get(
    "/{dataset_id}/dashboard/compare",
    response_model=DashboardCompareOut
)
def dashboard_compare(
    dataset_id: UUID,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    seller_id: UUID | None = Query(default=None),
    categories_limit: int = Query(5, ge=1, le=50),
    ranking_limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    ds = ensure_dataset(db, dataset_id)
    start_date, end_date = _normalize_date_filters(ds, start_date, end_date)

    # período anterior com mesma duração (inclusive)
    span_days = (end_date - start_date).days
    previous_end = start_date - timedelta(days=1)
    previous_start = previous_end - timedelta(days=span_days)

    current = _build_dashboard(
        db=db,
        dataset_id=dataset_id,
        start_date=start_date,
        end_date=end_date,
        seller_id=seller_id,
        categories_limit=categories_limit,
        ranking_limit=ranking_limit,
    )

    previous = _build_dashboard(
        db=db,
        dataset_id=dataset_id,
        start_date=previous_start,
        end_date=previous_end,
        seller_id=seller_id,
        categories_limit=categories_limit,
        ranking_limit=ranking_limit,
    )

    curr_total = float(current["kpis"]["total_value"] or 0.0)
    prev_total = float(previous["kpis"]["total_value"] or 0.0)

    growth = None
    if prev_total > 0:
        growth = float(((curr_total - prev_total) / prev_total) * 100.0)

    return {
        "current": current,
        "previous": previous,
        "current_start": start_date,
        "current_end": end_date,
        "previous_start": previous_start,
        "previous_end": previous_end,
        "growth_total_value_pct": growth,
    }


@router.get("/{dataset_id}/dashboard/export.csv")
def export_dashboard_csv(
    dataset_id: UUID,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    seller_id: UUID | None = Query(default=None),
    categories_limit: int = Query(5, ge=1, le=50),
    ranking_limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    ds = ensure_dataset(db, dataset_id)
    start_date, end_date = _normalize_date_filters(ds, start_date, end_date)

    dashboard = _build_dashboard(
        db=db,
        dataset_id=dataset_id,
        start_date=start_date,
        end_date=end_date,
        seller_id=seller_id,
        categories_limit=categories_limit,
        ranking_limit=ranking_limit,
    )

    buf = StringIO()
    w = csv.writer(buf)

    # META
    w.writerow(["section", "key", "value"])
    w.writerow(["meta", "dataset_id", str(dataset_id)])
    w.writerow(["meta", "start_date", str(start_date) if start_date else ""])
    w.writerow(["meta", "end_date", str(end_date) if end_date else ""])
    w.writerow(["meta", "seller_id", str(seller_id) if seller_id else ""])
    w.writerow([])

    # KPIs
    w.writerow(["KPIs"])
    w.writerow([
        "total_value", "avg_daily_value", "days",
        "best_day_date", "best_day_value",
        "worst_day_date", "worst_day_value"
    ])
    k = dashboard["kpis"]
    best = k.get("best_day") or {}
    worst = k.get("worst_day") or {}
    w.writerow([
        k.get("total_value", 0),
        k.get("avg_daily_value", 0),
        k.get("days", 0),
        best.get("date", ""),
        best.get("value", ""),
        worst.get("date", ""),
        worst.get("value", ""),
    ])
    w.writerow([])

    # SERIES
    w.writerow(["Series"])
    w.writerow(["date", "value"])
    for p in dashboard["series"]:
        w.writerow([p["date"], p["value"]])
    w.writerow([])

    # TOP CATEGORIES
    w.writerow(["Top Categories"])
    w.writerow(["category", "value"])
    for c in dashboard["top_categories"]:
        w.writerow([c["category"], c["value"]])
    w.writerow([])

    # SELLER RANKING
    w.writerow(["Seller Ranking"])
    w.writerow([
        "seller_id", "seller_name", "total_value",
        "avg_daily_value", "days"
    ])
    for r in dashboard["seller_ranking"]:
        w.writerow([
            r["seller_id"], r["seller_name"], r["total_value"],
            r["avg_daily_value"], r["days"]
        ])
    buf.seek(0)

    filename = (
        f"dashboard_{dataset_id}_{start_date or 'all'}_"
        f"{end_date or 'all'}.csv"
    )
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
