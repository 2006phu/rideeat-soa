FROM python:3.11-slim

WORKDIR /workspace

COPY services/payment-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/common /workspace/services/common
COPY services/payment-service /workspace/services/payment-service

WORKDIR /workspace/services/payment-service
ENV PYTHONPATH=/workspace

EXPOSE 8006
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8006"]
