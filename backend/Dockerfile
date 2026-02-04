# Use Playwright's official image - has all browser dependencies pre-installed
FROM mcr.microsoft.com/playwright/python:v1.49.1-jammy

# Set environment vars
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    APP_HOME=/app

WORKDIR $APP_HOME

# Additional system deps for your app (Playwright deps already in base image)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libmagic1 \
    libffi-dev \
    libxml2 \
    libxml2-dev \
    libxslt1-dev \
    libjpeg62-turbo-dev \
    zlib1g-dev \
    libcairo2 \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# NOTE: Playwright base image already has browser dependencies installed.

# Copy dependency files first (improve layer caching)
COPY requirements.txt ./

RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Ensure Playwright browsers are installed (Chromium is already in base image)
# This just verifies the installation
RUN python -c "from playwright.sync_api import sync_playwright; print('Playwright ready')"

# Copy application code
COPY . .

# The Playwright image runs as root by default. For security, create non-root user.
# Note: Playwright browsers work with non-root users in this image.
RUN useradd --create-home appuser && chown -R appuser:appuser $APP_HOME
USER appuser

# Expose port
EXPOSE 8000

# Default command (can be overridden in docker-compose)
CMD ["bash", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
