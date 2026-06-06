# ML Model Deployment Guide

## 3 Deployment Options

### **OPTION 1: Standalone FastAPI Server** ⭐ (Recommended for Cloud)
Perfect for microservices architecture, Kubernetes, Docker.

#### Start Server:
```bash
cd project_root/
python deploy_api.py
```

#### Server starts on: `http://localhost:8000`

#### Test with curl:
```bash
curl -X POST "http://localhost:8000/assess/combined" \
  -H "Content-Type: application/json" \
  -d '{
    "damage_text": "My phone screen is cracked",
    "device_brand": "Samsung",
    "device_model": "Galaxy A54",
    "device_age_months": 12,
    "device_type": "Smartphone",
    "repair_cost": 150.0,
    "price": 349.0
  }'
```

#### Integration from Frontend:
```javascript
// React/Vue/etc
const assessDevice = async (formData) => {
  const response = await fetch('http://localhost:8000/assess/combined', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  return await response.json();
};
```

#### Docker Deployment:
```dockerfile
# Dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install -r ml/requirements.txt
CMD ["python", "deploy_api.py"]
```

```bash
# Build and run
docker build -t repair-ml:latest .
docker run -p 8000:8000 repair-ml:latest
```

---

### **OPTION 2: Direct Python Integration** ⭐ (Recommended for Monolithic Apps)
Import directly in your existing FastAPI/Flask app. No separate service.

#### Installation:
```bash
cd project_root
pip install -r ml/requirements.txt
```

#### Usage in your main app.py:
```python
# backend/app.py (or wherever your main API is)
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ml.predict import combined_assessment

app = FastAPI()

class AssessmentRequest(BaseModel):
    damage_text: str
    device_brand: str
    device_model: str
    device_age_months: float
    device_type: str
    repair_cost: float = 0.0
    price: float = 0.0

@app.post("/api/assess-device")
async def assess_device(request: AssessmentRequest):
    """Assess device damage and repairability"""
    try:
        result = combined_assessment(
            damage_text=request.damage_text,
            device_brand=request.device_brand,
            device_model=request.device_model,
            device_age_months=request.device_age_months,
            device_type=request.device_type,
            repair_cost=request.repair_cost,
            price=request.price,
        )
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Start with: python app.py
```

#### Or with Flask:
```python
# app.py (Flask)
from flask import Flask, request, jsonify
from ml.predict import combined_assessment

app = Flask(__name__)

@app.route('/api/assess-device', methods=['POST'])
def assess_device():
    data = request.get_json()
    try:
        result = combined_assessment(
            damage_text=data['damage_text'],
            device_brand=data['device_brand'],
            device_model=data['device_model'],
            device_age_months=data['device_age_months'],
            device_type=data['device_type'],
            repair_cost=data.get('repair_cost', 0.0),
            price=data.get('price', 0.0),
        )
        return jsonify({"success": True, "data": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=False, port=8000)
```

#### Frontend usage (same as Option 1):
```javascript
const response = await fetch('http://localhost:8000/api/assess-device', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});
```

---

### **OPTION 3: Batch Processing** (For bulk assessments)
Process multiple devices at once, useful for reports/analysis.

#### Python Script:
```python
# batch_assess.py
import pandas as pd
from ml.predict import combined_assessment

# Load CSV with device data
devices_df = pd.read_csv('devices_to_assess.csv')
# Columns: damage_text, device_brand, device_model, device_age_months, device_type, repair_cost, price

results = []
for idx, row in devices_df.iterrows():
    result = combined_assessment(
        damage_text=row['damage_text'],
        device_brand=row['device_brand'],
        device_model=row['device_model'],
        device_age_months=row['device_age_months'],
        device_type=row['device_type'],
        repair_cost=row['repair_cost'],
        price=row['price'],
    )
    results.append({
        'device': f"{row['device_brand']} {row['device_model']}",
        'damage': result['damage_assessment']['predicted_label'],
        'repairability_score': result['repairability_assessment']['repairability_score'],
        'recommendation': result['overall_recommendation'],
    })

# Save results
results_df = pd.DataFrame(results)
results_df.to_csv('assessment_results.csv', index=False)
print(f"Processed {len(results)} devices")
```

#### Run:
```bash
python batch_assess.py
```

---

## Performance & Requirements

### CPU/Memory Usage:
- **Model Size**: ~215 MB loaded in memory
- **Inference Speed**: ~100ms per prediction
- **Throughput**: ~10 predictions/second on single CPU core
- **Latency**: <150ms end-to-end (including JSON overhead)

### Scaling:
- **Single CPU**: ~10 requests/sec
- **4-core CPU**: ~40 requests/sec
- **Multi-process**: Use `uvicorn --workers 4` for Option 1

### Recommended Deployment:
```bash
# Option 1: Production with 4 workers
uvicorn api_integration:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Environment Setup

### 1. Create .env file (optional):
```env
# .env
ML_MODEL_PATH=./ml/models
ML_DEBUG=false
```

### 2. Install dependencies:
```bash
pip install -r ml/requirements.txt
```

### 3. Verify models exist:
```bash
ls -la ml/models/
# Should show:
# - issue_classifier_voting.joblib
# - repairability_voting_regressor.joblib
# - training_summary.json
```

---

## API Response Examples

### Successful Assessment:
```json
{
  "damage_assessment": {
    "input": "My phone screen cracked",
    "predicted_label": "Cracked screen",
    "confidence": 0.95
  },
  "repairability_assessment": {
    "device_text": "Samsung Galaxy A54 Smartphone",
    "repairability_score": 7.2,
    "is_repairable": true,
    "recommendation": "Moderately repairable - some parts may be hard to find"
  },
  "overall_recommendation": "Device has Cracked screen and is repairable. Moderately repairable..."
}
```

### Error Response:
```json
{
  "detail": "Combined assessment failed: [error details]"
}
```

---

## Monitoring & Logging

### Option 1 (API Server):
Server logs all requests automatically. Check console output.

### Option 2 (Direct Import):
Add logging to your app:
```python
import logging
logger = logging.getLogger(__name__)

@app.post("/api/assess-device")
async def assess_device(request: AssessmentRequest):
    logger.info(f"Assessment request: {request.device_brand} {request.device_model}")
    result = combined_assessment(...)
    logger.info(f"Result: {result['overall_recommendation']}")
    return result
```

### Health Monitoring:
```python
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "models": ["issue_classifier", "repairability_scorer"],
        "timestamp": datetime.now().isoformat()
    }
```

---

## Updating Models (Retraining)

When you have new data, retrain:

```bash
cd ml/
python train_text_models.py
```

This will:
1. Load new data from `datasets/`
2. Train both models
3. Save updated models to `models/`
4. Update `training_summary.json`

**No code changes needed!** The deployment automatically uses the latest models.

---

## Troubleshooting

### Models not found:
```
FileNotFoundError: issue_classifier_voting.joblib not found
```
**Solution**: Run `python ml/train_text_models.py` first

### Import errors:
```
ModuleNotFoundError: No module named 'sklearn'
```
**Solution**: Run `pip install -r ml/requirements.txt`

### Slow predictions:
- Expected: ~100-150ms per request
- Check CPU usage: `top` or Task Manager
- Use Option 1 with multiple workers for production

### Memory issues:
- Models use ~500MB RAM
- Single prediction uses ~50-100MB
- Limit concurrent requests if needed

---

## TLDR - Quick Start

**For Monolithic App (Option 2 - FASTEST):**
```bash
# 1. Install dependencies
pip install -r ml/requirements.txt

# 2. Add to your app.py:
from ml.predict import combined_assessment
result = combined_assessment(damage_text=..., device_brand=..., ...)

# 3. Done! Use in API endpoint
```

**For Microservice (Option 1 - BEST PRACTICE):**
```bash
# 1. Start API server
python deploy_api.py

# 2. Call from frontend/other services
POST http://localhost:8000/assess/combined

# 3. Done!
```
