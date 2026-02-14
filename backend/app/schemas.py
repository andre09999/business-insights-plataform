from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


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


class DatasetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    status: str | None = Field(default=None, max_length=32)


class SellerCreate(BaseModel):
    name: str
    region: str | None = None
    is_active: bool = True


class SellerRead(SellerCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class SellerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    region: str | None = Field(default=None, max_length=80)
    is_active: bool | None = None


class SellerOut(BaseModel):
    id: UUID
    name: str
    region: str | None = None
    is_active: bool

    class Config:
        from_attributes = True


class RecordUpdate(BaseModel):
    seller_id: UUID | None = None
