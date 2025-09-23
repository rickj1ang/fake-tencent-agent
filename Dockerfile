FROM python:3.11-slim
WORKDIR /app
COPY ./backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY ./backend /app/backend
EXPOSE 8000
CMD ["python", "-m", "fastapi", "dev", "backend/main.py", "--host", "0.0.0.0", "--port", "8000"]
