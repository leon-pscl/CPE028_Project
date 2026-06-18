# Deployment Options

## Frontend (React + Vercel)

### Option 1: Vercel (Recommended)
1. Connect GitHub repo to Vercel
2. Set production branch to `main`
3. Configure env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Deploy automatically on push

### Option 2: Docker
```bash
docker-compose -f infra/docker-compose.yml up --build
# Frontend at http://localhost:5173
```

### Option 3: Manual
```bash
cd frontend
npm install
npm run build        # Production build in dist/
npm run preview      # Preview production build locally
```

---

## ML Service (FastAPI)

### Option 1: Standalone Server (Recommended for Cloud)
```bash
cd ml/
python api.py
# Server on http://localhost:8000
```

### Option 2: Docker
```bash
docker build -f ml/Dockerfile -t repair-ml:latest .
docker run -p 8000:8000 \
  -v $(pwd)/ml/models:/app/ml/models:ro \
  repair-ml:latest
```

### Option 3: Direct Import (Monolithic Apps)
```python
from ml.predict import combined_assessment
result = combined_assessment(damage_text=..., device_brand=..., ...)
```

---

## Full Stack (Docker Compose)

```bash
# Start all services
docker-compose -f infra/docker-compose.full.yml up -d

# View logs
docker-compose logs -f ml-service

# Stop
docker-compose down
```

---

## Environment Variables

```env
# Frontend
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEOAPIFY_API_KEY=your-geoapify-key

# ML Service (optional)
ML_DEBUG=false
ML_MODEL_PATH=./ml/models
ML_SERVICE_URL=http://localhost:8000
```

---

## Performance

| Component | Latency | Throughput |
|-----------|---------|------------|
| Frontend (Vercel CDN) | < 100ms | Unlimited |
| ML Service | 200-300ms | 5-10 req/s |
| Supabase queries | < 300ms | Depends on plan |

---

## Scaling

- **Frontend**: Vercel handles automatically
- **ML Service**: Run multiple containers with `docker-compose up --scale ml-service=3`
- **Database**: Upgrade Supabase plan or enable read replicas
