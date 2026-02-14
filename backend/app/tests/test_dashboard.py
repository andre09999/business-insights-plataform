import sys
from pathlib import Path
from fastapi.testclient import TestClient

# garante que /app entra no sys.path quando rodando no container
ROOT = Path(__file__).resolve().parents[2]  # /app
sys.path.insert(0, str(ROOT))

from app.main import app  # noqa: E402
client = TestClient(app)


def _first_dataset_id() -> str:
    r = client.get("/datasets")
    assert r.status_code == 200

    data = r.json()

    # suporta dois formatos:
    # 1) lista direta: [ {...}, {...} ]
    # 2) envelope: { "value": [ {...} ], ... }
    if isinstance(data, dict) and "value" in data:
        items = data["value"]
    else:
        items = data

    assert isinstance(items, list)
    assert len(items) > 0
    assert "id" in items[0]
    return items[0]["id"]


def test_dashboard_ok():
    ds_id = _first_dataset_id()

    r = client.get(f"/datasets/{ds_id}/dashboard")
    assert r.status_code == 200

    data = r.json()
    assert "kpis" in data
    assert "series" in data
    assert "top_categories" in data
    assert "seller_ranking" in data


def test_dashboard_invalid_dates_422():
    ds_id = _first_dataset_id()

    r = client.get(
        f"/datasets/{ds_id}/dashboard",
        params={"start_date": "2026-02-10", "end_date": "2026-02-01"},
    )
    assert r.status_code == 422


def test_export_csv_ok():
    ds_id = _first_dataset_id()

    r = client.get(
        f"/datasets/{ds_id}/dashboard/export.csv",
        params={"start_date": "2026-02-01", "end_date": "2026-02-15"},
    )
    assert r.status_code == 200
    assert "text/csv" in r.headers.get("content-type", "")

    content = r.text
    assert "KPIs" in content
    assert "Series" in content
    assert "Seller Ranking" in content
