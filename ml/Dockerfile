FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch (CPU only)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy requirements
COPY ml/requirements.txt .
COPY requirements.txt ./main_requirements.txt 2>/dev/null || true

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt && \
    if [ -f main_requirements.txt ]; then pip install --no-cache-dir -r main_requirements.txt; fi

# Copy ML module and models
COPY ml/ ./ml/

# Copy main app (if exists)
COPY frontend/ ./frontend/ 2>/dev/null || true
COPY infra/ ./infra/ 2>/dev/null || true

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run ML API server
CMD ["python", "-m", "ml.api_integration"]
