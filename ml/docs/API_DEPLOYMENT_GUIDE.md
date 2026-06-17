# 🚀 ML API Reference & Deployment Guide

## Quick Start

### Option A: Local Development
```bash
# Terminal 1: Start ML API
cd ml/
python api_integration.py
# API running on http://localhost:8000

# Terminal 2: Test endpoint
curl -X POST http://localhost:8000/assess/combined \
  -H "Content-Type: application/json" \
  -d '{
    "damage_text": "Screen is cracked",
    "device_brand": "Samsung",
    "device_model": "Galaxy A54",
    "device_age_months": 12,
    "device_type": "Smartphone",
    "repair_cost": 150.0,
    "price": 349.0,
    "fetch_marketplace": true
  }'
```

### Option B: Docker Compose
```bash
docker-compose up -d
# All services start (ML on port 8000, Frontend on port 5173)
```

### Option C: Docker Container
```bash
docker build -f ml/Dockerfile -t repair-ml:latest .
docker run -p 8000:8000 repair-ml:latest
```

---

## 📡 API Endpoints

### 1. Health Check
**GET** `/health`
```bash
curl http://localhost:8000/health

RESPONSE:
{
  "status": "healthy",
  "models": ["issue_classifier_voting", "repairability_voting_regressor"]
}
```

### 2. Issue Classification (Damage Detection)
**POST** `/assess/issue`

Identify damage type from user description.

**Request:**
```json
{
  "damage_text": "My phone screen is cracked and display is flickering"
}
```

**Response:**
```json
{
  "input": "My phone screen is cracked and display is flickering",
  "predicted_label": "Cracked screen",
  "confidence": 0.95
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/assess/issue \
  -H "Content-Type: application/json" \
  -d '{"damage_text": "Phone screen is broken"}'
```

### 3. Repairability Scoring
**POST** `/assess/repairability`

Predict device repairability score.

**Request:**
```json
{
  "device_text": "Samsung Galaxy A54 Smartphone",
  "device_source": "user_input",
  "repair_cost": 150.0,
  "usage_duration": 12,
  "price": 349.0,
  "customer_rating": 4.5,
  "battery_capacity": 5000,
  "weight": 190
}
```

**Response:**
```json
{
  "device_text": "Samsung Galaxy A54 Smartphone",
  "device_source": "user_input",
  "repairability_score": 7.5,
  "is_repairable": true,
  "recommendation": "Moderately repairable - some parts may be hard to find"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/assess/repairability \
  -H "Content-Type: application/json" \
  -d '{
    "device_text": "Samsung Galaxy A54",
    "device_source": "user_input",
    "repair_cost": 150.0,
    "usage_duration": 12,
    "price": 349.0
  }'
```

### 4. Combined Assessment (Damage + Repairability + Marketplace)
**POST** `/assess/combined`

⭐ **PRIMARY ENDPOINT** - Complete device assessment with marketplace pricing.

**Request:**
```json
{
  "damage_text": "Screen is cracked and battery drains fast",
  "device_brand": "Samsung",
  "device_model": "Galaxy A54",
  "device_age_months": 12,
  "device_type": "Smartphone",
  "repair_cost": 150.0,
  "price": 349.0,
  "fetch_marketplace": true
}
```

**Response:**
```json
{
  "damage_assessment": {
    "predicted_label": "Cracked screen",
    "confidence": 0.95
  },
  "repairability_assessment": {
    "repairability_score": 7.5,
    "is_repairable": true,
    "recommendation": "Moderately repairable..."
  },
  "marketplace_prices": [
    {
      "source": "Shopee",
      "title": "Samsung Galaxy A54 screen replacement",
      "price": 2500.00,
      "currency": "PHP",
      "url": "https://shopee.ph/..."
    },
    {
      "source": "Lazada",
      "title": "Samsung Galaxy A54 screen replacement",
      "price": 2400.00,
      "currency": "PHP",
      "url": "https://lazada.com.ph/..."
    }
  ],
  "cost_analysis": {
    "estimated_repair_cost": 2650.00,
    "estimated_parts_cost": 2450.00,
    "labor_cost": 150.00,
    "device_value": 349.00,
    "repair_ratio": 7.58,
    "recommendation": "Repair cost exceeds 70% of device value. Consider replacement."
  },
  "overall_recommendation": "Device has Cracked screen and is repairable. Moderately repairable..."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/assess/combined \
  -H "Content-Type: application/json" \
  -d '{
    "damage_text": "Screen cracked and battery bad",
    "device_brand": "Samsung",
    "device_model": "Galaxy A54",
    "device_age_months": 12,
    "device_type": "Smartphone",
    "repair_cost": 150.0,
    "price": 349.0,
    "fetch_marketplace": true
  }'
```

**Python Example:**
```python
import requests
import json

response = requests.post(
    'http://localhost:8000/assess/combined',
    json={
        'damage_text': 'Screen is cracked',
        'device_brand': 'Samsung',
        'device_model': 'Galaxy A54',
        'device_age_months': 12,
        'device_type': 'Smartphone',
        'repair_cost': 150.0,
        'price': 349.0,
        'fetch_marketplace': True
    }
)

assessment = response.json()
print(f"Damage: {assessment['damage_assessment']['predicted_label']}")
print(f"Repairability: {assessment['repairability_assessment']['repairability_score']}/10")
print(f"Cost: ${assessment['cost_analysis']['estimated_repair_cost']}")
print(f"Recommendation: {assessment['overall_recommendation']}")
```

### 5. Model Information
**GET** `/info/models`

Get model metadata and performance metrics.

**Response:**
```json
{
  "models": {
    "issue_classifier": {
      "name": "issue_classifier_voting.joblib",
      "type": "Voting Classifier",
      "accuracy": 0.988,
      "training_samples": 4000,
      "algorithms": ["LinearSVC", "RandomForest", "LogisticRegression"]
    },
    "repairability_scorer": {
      "name": "repairability_voting_regressor.joblib",
      "type": "Voting Regressor",
      "r2_score": 0.8763,
      "mae": 0.2122,
      "training_samples": 6548,
      "algorithms": ["DecisionTree", "RandomForest"]
    }
  }
}
```

### 6. API Schemas
**GET** `/info/schemas`

Get request/response schema definitions.

---

## 📊 Request Parameters Reference

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `damage_text` | string | ✅ Yes | - | User description of device damage |
| `device_brand` | string | ❌ No | "" | Device brand (e.g., Samsung, Apple) |
| `device_model` | string | ❌ No | "" | Device model (e.g., Galaxy S21) |
| `device_age_months` | float | ❌ No | 0.0 | Age of device in months |
| `device_type` | string | ❌ No | "" | Device type (Smartphone, Laptop, Tablet, etc.) |
| `repair_cost` | float | ❌ No | 0.0 | Estimated labor/repair cost in USD |
| `price` | float | ❌ No | 0.0 | Original device purchase price in USD |
| `fetch_marketplace` | boolean | ❌ No | true | Fetch real-time marketplace prices |

---

## 🛠️ Docker Deployment

### Build Image
```bash
docker build -f ml/Dockerfile -t repair-ml:latest .
```

### Run Container
```bash
# Basic run
docker run -p 8000:8000 repair-ml:latest

# With volume mount for models
docker run -p 8000:8000 \
  -v $(pwd)/ml/models:/app/ml/models:ro \
  repair-ml:latest

# With environment variables
docker run -p 8000:8000 \
  -e ML_DEBUG=false \
  -e PYTHONUNBUFFERED=1 \
  repair-ml:latest

# In background
docker run -d -p 8000:8000 \
  --name ml-api \
  --restart unless-stopped \
  repair-ml:latest
```

### Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f ml-service

# Stop services
docker-compose down

# Scale ML service (multiple instances)
docker-compose up -d --scale ml-service=3
```

---

## 📦 Containerization Verification

### Check Container Status
```bash
# List running containers
docker ps | grep repair-ml

# Check container logs
docker logs repair-ml-api

# Inspect container
docker inspect repair-ml-api

# Check resource usage
docker stats repair-ml-api
```

### Health Monitoring
```bash
# Health check endpoint
curl http://localhost:8000/health

# Expected response:
# {"status": "healthy", "models": [...]}

# Docker health check (auto-run every 30s)
# See Dockerfile for healthcheck config
```

---

## 🌐 Integration Examples

### React Frontend
```javascript
// components/AssessmentForm.jsx
import { useState } from 'react';

export default function AssessmentForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/assess/combined', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          damage_text: formData.description,
          device_brand: formData.brand,
          device_model: formData.model,
          device_age_months: formData.age,
          device_type: formData.type,
          repair_cost: 150, // Technician estimate
          price: formData.price,
          fetch_marketplace: true
        })
      });
      
      const assessment = await response.json();
      setResult(assessment);
      
      // Display to user
      displayResult({
        damage: assessment.damage_assessment.predicted_label,
        confidence: assessment.damage_assessment.confidence,
        repairability: assessment.repairability_assessment.repairability_score,
        marketplaceOptions: assessment.marketplace_prices,
        costAnalysis: assessment.cost_analysis,
        recommendation: assessment.overall_recommendation
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Assessing...' : 'Get Assessment'}
      </button>
      {result && <ResultDisplay data={result} />}
    </form>
  );
}
```

### Express Backend
```javascript
// routes/assessment.js
app.post('/api/assess/combined', async (req, res) => {
  const { damage, brand, model, age, type, price } = req.body;
  
  try {
    // Call ML service
    const mlResponse = await fetch('http://ml-service:8000/assess/combined', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        damage_text: damage,
        device_brand: brand,
        device_model: model,
        device_age_months: age,
        device_type: type,
        repair_cost: 150,
        price: price,
        fetch_marketplace: true
      })
    });
    
    const assessment = await mlResponse.json();
    
    // Store in database
    const saved = await Assessment.create({
      userEmail: req.user.email,
      assessment: assessment,
      createdAt: new Date()
    });
    
    res.json({ success: true, assessmentId: saved.id, data: assessment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## ⚙️ Configuration

### Environment Variables
```bash
# .env file
ML_DEBUG=false
ML_SERVICE_URL=http://localhost:8000
MARKETPLACE_ENABLED=true
SHOPEE_TIMEOUT=20
LAZADA_TIMEOUT=20
PYTHONUNBUFFERED=1
```

### Firewall Rules (for Docker)
```bash
# Allow port 8000
sudo ufw allow 8000

# Or for Docker networks
# (automatically handled by Docker)
```

---

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port
docker run -p 8001:8000 repair-ml:latest
```

### Models Not Loading
```bash
# Check if models exist
ls -la ml/models/

# If missing, retrain
python ml/training/scripts/train_text_models.py

# Check container mount
docker exec repair-ml-api ls -la /app/ml/models/
```

### Marketplace API Errors
```bash
# Test Shopee connectivity
curl -I https://shopee.ph/

# Test Lazada connectivity  
curl -I https://lazada.com.ph/

# If blocked, service still works (returns empty marketplace_prices)
```

### High Memory Usage
```bash
# Models are large (~500MB total)
# Ensure container has enough memory
docker run -m 2g repair-ml:latest

# Or limit in docker-compose.yml
services:
  ml-service:
    deploy:
      resources:
        limits:
          memory: 2G
```

---

## 📈 Performance Metrics

### Latency
- **Issue Classification**: 50-100ms
- **Repairability Scoring**: 50-100ms
- **Marketplace API**: 100-150ms per source (parallel)
- **Total (Combined)**: ~200-300ms

### Throughput
- **Single Container**: 5-10 requests/second
- **With Docker Compose (3 replicas)**: 15-30 requests/second

### Memory
- **Container Base**: 200MB
- **ML Models**: 300MB
- **Runtime Overhead**: 100MB
- **Total Per Container**: ~600MB
- **Marketplace Cache**: +50MB

### Marketplace Timeout
- **Shopee API**: 20 seconds (configurable)
- **Lazada Scrape**: 20 seconds (configurable)
- If marketplace times out, service still returns assessment (without marketplace_prices)

---

## 📚 Additional Resources

- [Model Training Guide](MODEL_TRAINING_GUIDE.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Integration Guide](INTEGRATION.md)
- [Docker Documentation](https://docs.docker.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

## ✅ Deployment Checklist

- [ ] Models trained and in `ml/models/`
- [ ] Docker image built successfully
- [ ] Container starts without errors
- [ ] Health check endpoint returns 200
- [ ] `/assess/combined` endpoint works
- [ ] Marketplace integration tested
- [ ] Frontend integrated with `/api/assess/combined`
- [ ] Environment variables configured
- [ ] Logging configured
- [ ] Load testing completed
- [ ] Backup strategy in place
- [ ] Monitoring alerts set up

---

**Ready for production! 🚀**
