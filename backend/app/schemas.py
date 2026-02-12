from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel


class DatasetOut(BaseModel):
    id: UUID
    name: str
    source_filename: str | None = None
    status: str
    row_count: int
    date_min: date | None = None
    date_max: date | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class SeriesPoint(BaseModel):
    date: date
    value: float


class DayValue(BaseModel):
    date: date
    value: float


class KpisOut(BaseModel):
    total_value: float
    avg_daily_value: float
    days: int
    best_day: DayValue | None = None
    worst_day: DayValue | None = None


class CategoryTotal(BaseModel):
    category: str
    value: float


class UploadResponse(BaseModel):
    dataset_id: UUID
    rows_inserted: int
