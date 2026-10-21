FROM python:3.11-slim

WORKDIR /app/services/user-service

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app:/app/services/user-service

COPY services/user-service/requirements.txt /app/services/user-service/requirements.txt
RUN pip install --no-cache-dir -r /app/services/user-service/requirements.txt

COPY services/common /app/services/common
COPY services/user-service /app/services/user-service

EXPOSE 8002

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
