FROM python:3.11-slim

WORKDIR /workspace

COPY services/rating-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/common /workspace/services/common
COPY services/rating-service /workspace/services/rating-service

WORKDIR /workspace/services/rating-service
ENV PYTHONPATH=/workspace

EXPOSE 8007
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8007"]
