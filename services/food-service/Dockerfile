FROM python:3.11-slim

WORKDIR /workspace

COPY services/food-service/requirements.txt /workspace/requirements.txt
RUN pip install --no-cache-dir -r /workspace/requirements.txt

COPY services/common /workspace/services/common
COPY services/food-service /workspace/services/food-service

WORKDIR /workspace/services/food-service
ENV PYTHONPATH=/workspace:/workspace/services/food-service
EXPOSE 8004

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004"]
