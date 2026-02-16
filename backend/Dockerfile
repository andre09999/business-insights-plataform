FROM python:3.12-slim

WORKDIR /app

# Copia apenas requirements primeiro (melhora cache)
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copia a aplicação inteira (inclui app/demo)
COPY app ./app

EXPOSE 8000

# Executa bootstrap antes de subir a API
CMD ["sh", "-c", "python -c 'from app.bootstrap import run; run()' && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
