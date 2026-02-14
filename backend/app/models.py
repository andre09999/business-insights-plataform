import uuid

from sqlalchemy import (
    String, Date, Numeric, Text, ForeignKey, Integer, DateTime, func, Boolean
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    source_filename: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="ready"
    )
    row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    date_min: Mapped[object | None] = mapped_column(Date, nullable=True)
    date_max: Mapped[object | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    records: Mapped[list["Record"]] = relationship(
        back_populates="dataset",
        cascade="all, delete-orphan"
    )
    insights: Mapped[list["Insight"]] = relationship(
        back_populates="dataset", cascade="all, delete-orphan"
    )


class Seller(Base):
    __tablename__ = "sellers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    region: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True,
    )
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    records: Mapped[list["Record"]] = relationship(back_populates="seller")


class Record(Base):
    __tablename__ = "records"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False
    )
    seller_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sellers.id", ondelete="SET NULL"),
        nullable=True
    )

    event_date: Mapped[object] = mapped_column(Date, nullable=False)
    category: Mapped[str | None] = mapped_column(String(200), nullable=True)
    value: Mapped[object] = mapped_column(
        Numeric(14, 2), nullable=False, default=0
    )
    quantity: Mapped[object | None] = mapped_column(
        Numeric(14, 2), nullable=True
    )
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    dataset: Mapped["Dataset"] = relationship(back_populates="records")
    seller: Mapped["Seller"] = relationship(back_populates="records")


class Insight(Base):
    __tablename__ = "insights"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("datasets.id"), nullable=False
    )

    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    dataset: Mapped["Dataset"] = relationship(back_populates="insights")
