# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/Frontend
COPY Frontend/package*.json ./
RUN npm install
COPY Frontend/ ./
RUN npm run build

# Stage 2: Build the Flask backend and package with Google Chrome
FROM python:3.10-slim

# Install system dependencies & Google Chrome stable via official .deb package
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    curl \
    unzip \
    procps \
    && wget -q https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - || true \
    && wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y ./google-chrome-stable_current_amd64.deb \
    && rm google-chrome-stable_current_amd64.deb \
    && rm -rf /var/lib/apt/lists/*

# Set up work directory
WORKDIR /app

# Copy backend requirements, remove Windows-only/unused packages, and install
COPY Backend/requirements.txt ./Backend/
RUN sed -i '/pywin32/d' ./Backend/requirements.txt \
    && sed -i '/pypiwin32/d' ./Backend/requirements.txt \
    && sed -i '/pywinpty/d' ./Backend/requirements.txt \
    && sed -i '/comtypes/d' ./Backend/requirements.txt \
    && sed -i '/PyAudio/d' ./Backend/requirements.txt \
    && sed -i '/pyttsx3/d' ./Backend/requirements.txt \
    && pip install --no-cache-dir -r Backend/requirements.txt

# Copy Flask backend code
COPY Backend/ ./Backend/

# Copy React built frontend files from Stage 1
COPY --from=frontend-builder /app/Frontend/dist /app/Frontend/dist

# Expose server port
EXPOSE 5002

# Environment variables
ENV PORT=5002
ENV RENDER=true
ENV HEADLESS=true
ENV PYTHONUNBUFFERED=1

# Command to run the application
CMD ["python", "Backend/main.py"]
