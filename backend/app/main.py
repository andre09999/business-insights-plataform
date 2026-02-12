from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
from .db import engine
from .bootstrap import run as bootstrap_run
from .routers.datasets import router as datasets_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    bootstrap_run()
    yield


app = FastAPI(title="Business Insights Platform", lifespan=lifespan)


app.include_router(datasets_router)


@app.get("/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "db": "ok"}
