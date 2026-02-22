from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
from .db import engine
from .bootstrap import run as bootstrap_run
from .routers.datasets import router as datasets_router
from .routers.records import router as records_router
from .routers.sellers import router as sellers_router
import os
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    bootstrap_run()
    yield


app = FastAPI(title="Business Insights Platform", lifespan=lifespan)


def _parse_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "")
    # aceita: "http://localhost:5173,http://127.0.0.1:5173"
    # aceita com espaços e aspas acidentais
    origins = []
    for part in raw.split(","):
        o = part.strip().strip('"').strip("'")
        if o:
            origins.append(o)
    return origins


origins = _parse_cors_origins()

# fallback DEV (se não setar nada)
if not origins:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://business-insights-plataform.netlify.app/"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(datasets_router)
app.include_router(sellers_router)
app.include_router(records_router)


@app.get("/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "db": "ok"}
