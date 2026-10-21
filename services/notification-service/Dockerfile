FROM python:3.11-slim

WORKDIR /workspace

COPY services/notification-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/common /workspace/services/common
COPY services/notification-service /workspace/services/notification-service

WORKDIR /workspace/services/notification-service
ENV PYTHONPATH=/workspace

EXPOSE 8009
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8009"]
