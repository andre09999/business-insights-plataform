from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from uuid import UUID

from ..deps import get_db
from ..models import Seller
from ..schemas import SellerCreate, SellerOut, SellerUpdate

router = APIRouter(prefix="/sellers", tags=["sellers"])


@router.post("", response_model=SellerOut, status_code=201)
def create_seller(
    payload: SellerCreate, db: Session = Depends(get_db)
):
    exists = db.scalar(
        select(Seller).where(Seller.name == payload.name.strip())
    )
    if exists:
        raise HTTPException(
            status_code=409, detail="Seller name already exists"
        )

    seller = Seller(
        name=payload.name.strip(),
        region=(payload.region.strip() if payload.region else None),
        is_active=payload.is_active,
    )
    db.add(seller)
    db.commit()
    db.refresh(seller)
    return seller


@router.get("", response_model=list[SellerOut])
def list_sellers(
    q: str | None = Query(default=None, description="Busca por nome"),
    db: Session = Depends(get_db),
):
    stmt = select(Seller).order_by(Seller.name.asc())
    if q:
        stmt = stmt.where(Seller.name.ilike(f"%{q.strip()}%"))
    return db.scalars(stmt).all()


@router.get("/{seller_id}", response_model=SellerOut)
def get_seller(seller_id: UUID, db: Session = Depends(get_db)):
    seller = db.get(Seller, seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    return seller


@router.patch("/{seller_id}", response_model=SellerOut)
def update_seller(
    seller_id: UUID, payload: SellerUpdate, db: Session = Depends(get_db)
):
    seller = db.get(Seller, seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    if payload.name is not None:
        new_name = payload.name.strip()
        dup = db.scalar(
            select(Seller).where(
                Seller.name == new_name, Seller.id != seller_id
            )
        )
        if dup:
            raise HTTPException(
                status_code=409, detail="Seller name already exists"
            )

        seller.name = new_name

    if payload.region is not None:
        seller.region = payload.region.strip() if payload.region else None

    if payload.is_active is not None:
        seller.is_active = payload.is_active

    db.commit()
    db.refresh(seller)
    return seller


@router.delete("/{seller_id}")
def delete_seller(seller_id: UUID, db: Session = Depends(get_db)):
    seller = db.get(Seller, seller_id)
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")

    db.delete(seller)
    db.commit()
    return {"deleted": True, "seller_id": str(seller_id)}
