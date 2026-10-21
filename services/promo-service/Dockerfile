FROM python:3.11-slim

WORKDIR /workspace

COPY services/promo-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/common /workspace/services/common
COPY services/promo-service /workspace/services/promo-service

WORKDIR /workspace/services/promo-service
ENV PYTHONPATH=/workspace

EXPOSE 8008
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8008"]
