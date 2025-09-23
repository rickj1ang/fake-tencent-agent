# ---- Stage 1: Build frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /web/frontend
# Copy only manifest files first for better caching
COPY ./frontend/package*.json ./
COPY ./frontend/tsconfig*.json ./
COPY ./frontend/vite.config.ts ./
RUN npm ci
# Copy the rest of the frontend source and build
COPY ./frontend .
RUN npm run build

# ---- Stage 2: Backend runtime ----
FROM python:3.11-slim
WORKDIR /app
COPY ./backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt
COPY ./backend /app/backend
# Copy built frontend into /app/static
COPY --from=frontend-build /web/frontend/dist /app/static
ENV STATIC_DIR=/app/static
EXPOSE 8000
CMD ["python", "-m", "fastapi", "dev", "backend/main.py", "--host", "0.0.0.0", "--port", "8000"]
