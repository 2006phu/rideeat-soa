FROM python:3.11-slim

WORKDIR /app/services/map-service

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app:/app/services/map-service

COPY services/map-service/requirements.txt /app/services/map-service/requirements.txt
RUN pip install --no-cache-dir -r /app/services/map-service/requirements.txt

COPY services/common /app/services/common
COPY services/map-service /app/services/map-service

EXPOSE 8005

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005"]
