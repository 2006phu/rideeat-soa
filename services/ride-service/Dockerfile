FROM python:3.11-slim

WORKDIR /workspace

COPY services/ride-service/requirements.txt /workspace/requirements.txt
RUN pip install --no-cache-dir -r /workspace/requirements.txt

COPY services/common /workspace/services/common
COPY services/ride-service /workspace/services/ride-service

WORKDIR /workspace/services/ride-service
ENV PYTHONPATH=/workspace:/workspace/services/ride-service
EXPOSE 8003

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
