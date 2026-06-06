#!/usr/bin/env python3
"""
DEPLOYMENT OPTIONS FOR ML MODELS

Choose one of the 3 deployment methods below based on your needs:

1. STANDALONE API SERVER (FastAPI + Uvicorn)
   - Best for: Microservice architecture, standalone deployment
   - Port: 8000
   - Command: python deploy_api.py

2. INTEGRATED WITH MAIN APP (Direct import)
   - Best for: Monolithic apps, same process
   - Import: from ml.predict import combined_assessment
   - Latency: <100ms per prediction

3. DOCKER CONTAINER (Optional)
   - Best for: Cloud deployment, Kubernetes
   - Build: docker build -t repair-ml:latest .
   - Run: docker run -p 8000:8000 repair-ml:latest

This script shows Option 1 (API Server) as example.
"""

import uvicorn
from pathlib import Path
import sys

# Add ml module to path
ml_dir = Path(__file__).parent / "ml"
sys.path.insert(0, str(ml_dir))

# Import the FastAPI app
from api_integration import app


def main():
    """Start the ML API server"""
    print("""
    ╔════════════════════════════════════════════════════════════════╗
    ║  ML MODEL DEPLOYMENT - FASTAPI SERVER                          ║
    ╚════════════════════════════════════════════════════════════════╝
    
    🚀 Starting ML API Server...
    
    📍 Server URL:    http://localhost:8000
    📋 API Docs:      http://localhost:8000/docs
    
    ✅ Available Endpoints:
       • POST /health                 - Health check
       • POST /assess/issue          - Classify damage type
       • POST /assess/repairability  - Score repairability
       • POST /assess/combined       - Both in one call
       • GET  /info/models           - Model metrics
       • GET  /info/schemas          - Schema info
    
    📝 Example Request:
    
    curl -X POST "http://localhost:8000/assess/combined" \\
      -H "Content-Type: application/json" \\
      -d '{
        "damage_text": "My phone screen is cracked",
        "device_brand": "Samsung",
        "device_model": "Galaxy A54",
        "device_age_months": 12,
        "device_type": "Smartphone",
        "repair_cost": 150.0,
        "price": 349.0
      }'
    
    Press CTRL+C to stop the server
    
    ═══════════════════════════════════════════════════════════════════
    """)
    
    # Start the server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True,
    )


if __name__ == "__main__":
    main()
