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
    && wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y ./google-chrome-stable_current_amd64.deb \
    && rm google-chrome-stable_current_amd64.deb \
    && rm -rf /var/lib/apt/lists/*

# Set up work directory
WORKDIR /app

# Copy backend requirements and install
COPY Backend/requirements.txt ./Backend/
RUN pip install --no-cache-dir -r Backend/requirements.txt

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
