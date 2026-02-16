from __future__ import annotations

from pathlib import Path
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from .db import engine, SessionLocal, Base
from .models import Dataset, Record, Insight, Seller
from .services.csv_importer import parse_csv


DEMO_CSV = (
    Path(__file__).resolve().parent
    / "demo"
    / "demo_sales_with_seller.csv"
)


def create_tables():
    Base.metadata.create_all(bind=engine)


def _get_or_create_seller(db: Session, seller_name: str) -> Seller:
    name = seller_name.strip()
    if not name:
        raise ValueError("Empty seller name")

    existing = db.scalar(select(Seller).where(Seller.name == name))
    if existing:
        return existing

    s = Seller(name=name, region=None, is_active=True)
    db.add(s)
    db.flush()
    return s


def seed_if_empty():
    db = SessionLocal()
    try:
        count = db.scalar(select(func.count(Dataset.id)))
        if count and count > 0:
            return

        if not DEMO_CSV.exists():
            raise RuntimeError(f"Arquivo demo não encontrado: {DEMO_CSV}")

        content = DEMO_CSV.read_bytes()

        # usa o MESMO parser do upload
        df, date_col, value_col, cat_col, seller_col = parse_csv(content)

        ds = Dataset(
            name="Demo - Vendas (CSV Seed)",
            source_filename=DEMO_CSV.name,
            status="processing",
        )
        db.add(ds)
        db.flush()

        seller_cache: dict[str, str] = {}
        records: list[Record] = []

        for _, row in df.iterrows():
            seller_id = None

            if seller_col:
                raw = row.get(seller_col)
                seller_name = (str(raw).strip() if raw is not None else "")
                if seller_name:
                    if seller_name not in seller_cache:
                        seller = _get_or_create_seller(db, seller_name)
                        seller_cache[seller_name] = str(seller.id)
                    seller_id = seller_cache[seller_name]

            records.append(
                Record(
                    dataset_id=ds.id,
                    seller_id=seller_id,
                    event_date=row[date_col],
                    category=(str(row[cat_col]) if cat_col else None),
                    value=float(row[value_col]),
                    quantity=1,
                    meta={"seed": True},
                )
            )

        db.add_all(records)

        ds.row_count = len(records)
        ds.date_min = df[date_col].min()
        ds.date_max = df[date_col].max()
        ds.status = "ready"

        db.add(
            Insight(
                dataset_id=ds.id,
                kind="summary",
                title="Seed CSV aplicado",
                content=(
                    "Dataset demo criado automaticamente via CSV no "
                    "bootstrap."
                ),
                severity=1,
                payload={"rows": len(records)},
            )
        )

        db.commit()
    finally:
        db.close()


def run():
    create_tables()
    seed_if_empty()
