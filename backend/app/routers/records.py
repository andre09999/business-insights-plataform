from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models import Record, Seller
from ..schemas import RecordUpdate

router = APIRouter(prefix="/records", tags=["records"])


@router.patch("/{record_id}")
def update_record(
    record_id: int, payload: RecordUpdate, db: Session = Depends(get_db)
):
    rec = db.get(Record, record_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Record not found")

    # valida seller_id (se foi enviado)
    if payload.seller_id is not None:
        seller = db.get(Seller, payload.seller_id)
        if not seller:
            raise HTTPException(status_code=404, detail="Seller not found")
        rec.seller_id = payload.seller_id
    else:
        # permitir setar null (desvincular)
        rec.seller_id = None

    db.commit()
    db.refresh(rec)
    return {
        "updated": True,
        "record_id": rec.id,
        "seller_id": str(rec.seller_id) if rec.seller_id else None,
    }
