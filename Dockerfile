# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/Frontend
COPY Frontend/package*.json ./
RUN npm install
COPY Frontend/ ./
RUN npm run build

# Stage 2: Build the Flask backend and package with Google Chrome
FROM python:3.10-slim

# Install system dependencies & Google Chrome stable
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    curl \
    unzip \
    libnss3 \
    libgconf-2-4 \
    libxss1 \
    libasound2 \
    libxtst6 \
    libgtk-3-0 \
    libgbm1 \
    procps \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
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
