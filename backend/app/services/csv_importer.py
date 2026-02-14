import pandas as pd

DATE_CANDIDATES = ["date", "data", "event_date", "dia"]
VALUE_CANDIDATES = ["value", "valor", "amount", "receita", "total"]
CATEGORY_CANDIDATES = ["category", "categoria", "segmento", "canal", "channel"]
SELLER_CANDIDATES = [
    "seller", "vendedor", "salesperson", "representante", "consultor"
]


def _pick_column(columns: list[str], candidates: list[str]) -> str | None:
    cols = [c.strip() for c in columns]
    lower_map = {c.lower(): c for c in cols}

    # match exato
    for cand in candidates:
        if cand.lower() in lower_map:
            return lower_map[cand.lower()]

    # match "contém"
    for cand in candidates:
        for c in cols:
            if cand.lower() in c.lower():
                return c

    return None


def parse_csv(content: bytes) -> tuple[pd.DataFrame, str, str, str | None]:
    df = pd.read_csv(pd.io.common.BytesIO(content))

    if df.empty:
        raise ValueError("CSV vazio.")

    date_col = _pick_column(list(df.columns), DATE_CANDIDATES)
    value_col = _pick_column(list(df.columns), VALUE_CANDIDATES)
    cat_col = _pick_column(list(df.columns), CATEGORY_CANDIDATES)
    seller_col = _pick_column(list(df.columns), SELLER_CANDIDATES)

    if not date_col:
        raise ValueError(
            f"Coluna de data não encontrada. Aceitas: {DATE_CANDIDATES}"
        )
    if not value_col:
        raise ValueError(
            f"Coluna de valor não encontrada. Aceitas: {VALUE_CANDIDATES}"
        )

    # normaliza data e valor
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce").dt.date
    df[value_col] = pd.to_numeric(df[value_col], errors="coerce")

    df = df.dropna(subset=[date_col, value_col])

    if df.empty:
        raise ValueError(
            "Nenhuma linha válida após parse (data/valor inválidos)."
        )

    seller_col = _pick_column(list(df.columns), SELLER_CANDIDATES)

    return df, date_col, value_col, cat_col, seller_col
