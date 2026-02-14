import sys
from pathlib import Path

# garante que /app entra no sys.path
ROOT = Path(__file__).resolve().parents[2]  # /app
sys.path.insert(0, str(ROOT))

from app.main import app
