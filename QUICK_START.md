🚀 **QUICK START GUIDE**

---

## ⚠️ BEFORE YOU START: Start Docker Desktop

The containerization requires Docker to be running.

### Windows Users:
```
1. Open Start Menu
2. Search for "Docker Desktop"
3. Click to launch
4. Wait 30-60 seconds for initialization
5. Check system tray - you should see the Docker whale icon
```

Or via PowerShell (if installed in default location):
```powershell
& "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### Verify Docker is Running:
```bash
docker --version
docker ps
# Should NOT show: "Cannot connect to Docker daemon"
```

---

## ⚡ FASTEST START (Docker Compose)

```bash
# 1. Navigate to project root
cd c:\Users\norud\Documents\DevOps_Proj\CPE028_Project

# 2. Start all services (one command!)
docker-compose up -d

# 3. Wait 30 seconds for containers to start

# 4. Verify services are running
docker-compose ps
# You should see:
# repair-ml-api       (port 8000)
# repair-db           (port 5432)
# repair-frontend     (port 5173)

# 5. Test the API
curl http://localhost:8000/health

# 6. Open in browser
# API Docs: http://localhost:8000/docs
# Frontend: http://localhost:5173 (if built)
```

### That's It! ✅ The API is now running on port 8000

---

## 🧪 TEST THE API

### Option 1: cURL (command line)
```bash
curl -X POST http://localhost:8000/assess/combined \
  -H "Content-Type: application/json" \
  -d '{
    "damage_text": "My phone screen is cracked and battery drains fast",
    "device_brand": "Samsung",
    "device_model": "Galaxy A54",
    "device_age_months": 12,
    "device_type": "Smartphone",
    "repair_cost": 150.0,
    "price": 349.0,
    "fetch_marketplace": true
  }'
```

### Option 2: Browser (Swagger UI)
```
http://localhost:8000/docs
- Click on "POST /assess/combined"
- Click "Try it out"
- Fill in JSON example
- Click "Execute"
```

### Option 3: Python
```python
import requests

response = requests.post(
    'http://localhost:8000/assess/combined',
    json={
        'damage_text': 'Screen cracked and battery bad',
        'device_brand': 'Samsung',
        'device_model': 'Galaxy A54',
        'repair_cost': 150.0,
        'price': 349.0,
        'fetch_marketplace': True
    }
)

print(response.json())
```

### Option 4: Run Examples
```bash
python ml/example_usage_marketplace.py
```

---

## 📊 WHAT YOU GET

The API returns a complete assessment:
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
      "currency": "PHP"
    }
  ],
  "cost_analysis": {
    "estimated_repair_cost": 2650.00,
    "repair_ratio": 7.58,
    "recommendation": "Repair cost exceeds 70%... Consider replacement."
  },
  "overall_recommendation": "Device has Cracked screen and is repairable..."
}
```

---

## 🛑 STOP THE SERVICES

```bash
# Stop all services
docker-compose down

# Or remove volumes too (clean slate)
docker-compose down -v
```

---

## 📋 COMPLETE COMMAND REFERENCE

### Start Services
```bash
docker-compose up -d          # Start in background
docker-compose up             # Start and show logs
docker-compose up --build     # Rebuild images first
```

### Monitor Services
```bash
docker-compose ps             # List running containers
docker-compose logs           # View all logs
docker-compose logs ml-service  # View ML service logs only
docker-compose logs -f ml-service # Follow ML logs (live)
```

### Execute Commands
```bash
docker-compose exec ml-service python -c "import ml.predict; print('OK')"
docker-compose exec postgres psql -U repair_user -d repair_db
```

### Clean Up
```bash
docker-compose down           # Stop services
docker-compose down -v        # Stop + remove volumes
docker image prune            # Remove unused images
docker system prune           # Clean up everything
```

---

## 🔧 IF SOMETHING GOES WRONG

### Docker daemon not running
```powershell
# Start Docker Desktop
& "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Wait 30 seconds, then:
docker ps
```

### Port already in use (e.g., port 8000)
```bash
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill the process (replace <PID>)
taskkill /PID <PID> /F

# Or use different port in docker-compose.yml
# Change: ports: ["8000:8000"]
# To:     ports: ["8001:8000"]
```

### Models not found
```bash
# Check if models exist
dir ml\models\

# If missing, they should auto-download on first run
# If not, train them:
python ml/train_text_models.py
```

### Out of disk space
```bash
# Clean Docker data
docker system prune -a

# Remove old images
docker image rm repair-ml:old
```

### Container won't start
```bash
# Check logs
docker-compose logs ml-service

# Rebuild image
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📚 DOCUMENTATION FILES

- **COMPLETION_SUMMARY.md** ← Start here for overview
- **INTEGRATION_MARKETPLACE.md** ← Architecture & integration examples
- **API_DEPLOYMENT_GUIDE.md** ← Complete API reference
- **ml/API_DEPLOYMENT_GUIDE.md** ← Detailed API docs
- **ml/DEPLOYMENT_GUIDE.md** ← Deployment options
- **ml/MODEL_TRAINING_GUIDE.md** ← Model details

---

## 🌐 INTEGRATING WITH YOUR APP

### Frontend (React/Vue)
```javascript
const response = await fetch('http://localhost:8000/assess/combined', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    damage_text: userInput,
    device_brand: brand,
    device_model: model,
    device_age_months: age,
    device_type: type,
    repair_cost: 150,
    price: price,
    fetch_marketplace: true
  })
});

const assessment = await response.json();
displayResults(assessment);
```

### Backend (Node/Express)
```javascript
app.post('/api/assess', async (req, res) => {
  const response = await fetch('http://ml-service:8000/assess/combined', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  
  const assessment = await response.json();
  res.json(assessment);
});
```

### Backend (Python/Flask)
```python
import requests

def assess_device(damage_text, device_info):
    response = requests.post(
        'http://localhost:8000/assess/combined',
        json={
            'damage_text': damage_text,
            **device_info,
            'fetch_marketplace': True
        }
    )
    return response.json()
```

---

## 📈 EXPECTED PERFORMANCE

| Metric | Value |
|--------|-------|
| API Response Time | 200-300ms |
| Throughput | 5-10 req/s |
| Memory Usage | ~600MB per container |
| CPU Usage | Minimal (<5%) at rest |

---

## ✅ SUCCESS INDICATORS

When everything is working:

1. ✅ `docker-compose ps` shows 3 containers running
2. ✅ `curl http://localhost:8000/health` returns 200
3. ✅ `http://localhost:8000/docs` shows Swagger UI
4. ✅ POST request to `/assess/combined` returns assessment
5. ✅ Response includes `marketplace_prices` and `cost_analysis`
6. ✅ Overall recommendation is clear and actionable

---

## 🎯 NEXT STEPS

1. ✅ Start Docker Desktop (see above)
2. ✅ Run `docker-compose up -d`
3. ✅ Test API with curl/Swagger/Python
4. ✅ Integrate with your frontend
5. ✅ Display results to users
6. ✅ Store assessments in database (optional)

---

## 📞 TROUBLESHOOTING CHECKLIST

- [ ] Docker Desktop is running (check system tray)
- [ ] `docker ps` shows containers
- [ ] `curl http://localhost:8000/health` returns 200
- [ ] Models exist in `ml/models/`
- [ ] No port conflicts (try different port if needed)
- [ ] Check logs: `docker-compose logs ml-service`
- [ ] Marketplace timeout (optional, service works without it)

---

## 🚀 YOU'RE READY!

Everything is set up and ready to go. 

**Just start Docker Desktop and run:**
```bash
docker-compose up -d
```

**Your ML API is now online at:**
```
http://localhost:8000
```

**Have questions?** Check the documentation files or review the API reference at:
```
http://localhost:8000/docs
```

---

**Made with ❤️ for device repair assessment**
