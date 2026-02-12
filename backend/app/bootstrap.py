from datetime import date, timedelta
from sqlalchemy import select, func

from .db import engine, SessionLocal, Base
from .models import Dataset, Record, Insight


def create_tables():
    Base.metadata.create_all(bind=engine)


def seed_if_empty():
    db = SessionLocal()
    try:
        count = db.scalar(select(func.count(Dataset.id)))
        if count and count > 0:
            return

        ds = Dataset(
            name="Demo - Vendas",
            source_filename="demo_sales.csv",
            status="ready"
        )
        db.add(ds)
        db.flush()

        start = date.today() - timedelta(days=29)
        channels = ["Online", "Loja", "Marketplace"]
        for i in range(30):
            day = start + timedelta(days=i)
            cat = channels[i % len(channels)]
            value = 900 + (i * 35) % 700

            db.add(Record(
                dataset_id=ds.id,
                event_date=day,
                category=cat,
                value=value,
                quantity=1,
                meta={"seed": True, "channel": cat},
            ))

        db.add(Insight(
            dataset_id=ds.id,
            kind="summary",
            title="Resumo do período",
            content="Dataset demo com 30 dias de vendas para "
                    "testes de dashboard e insights.",
            severity=1,
            payload={"days": 30},
        ))

        ds.row_count = 30
        ds.date_min = start
        ds.date_max = date.today()

        db.commit()
    finally:
        db.close()


def run():
    create_tables()
    seed_if_empty()
