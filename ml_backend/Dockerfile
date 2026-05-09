FROM python:3.10-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Dependencies (system libs are not needed since we use psycopg2-binary and manylinux wheels)

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Устанавливаем пути для python, чтобы импорты работали правильно
ENV PYTHONPATH "${PYTHONPATH}:/app/src"

EXPOSE 8000
