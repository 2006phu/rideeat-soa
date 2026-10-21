FROM python:3.11-slim

WORKDIR /app/services/auth-service

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app:/app/services/auth-service

COPY services/auth-service/requirements.txt /app/services/auth-service/requirements.txt
RUN pip install --no-cache-dir -r /app/services/auth-service/requirements.txt

COPY services/common /app/services/common
COPY services/auth-service /app/services/auth-service

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
