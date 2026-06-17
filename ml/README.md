# ML Service

This folder contains the FastAPI ML inference service for device assessment.

## What is included

- `api_integration_unified.py` — FastAPI production API (text + image + marketplace)
- `predict_unified.py` — Unified inference pipeline (NLP + vision + repairability)
- `predict.py` — Legacy inference (issue classification + repairability scoring)
- `marketplace.py` — Shopee/Lazada price fetching
- `models/` — Saved model weights (.joblib, .pth)
- `training/` — Training environment (scripts + datasets)
- `examples/` — Usage examples
- `tests/` — Test suite
- `docs/` — ML-specific guides

## Quick Start

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Start the FastAPI service:

```bash
python -m ml.api_integration_unified
```

3. Health check:

```bash
curl http://127.0.0.1:8000/health
```

4. Combined assessment:

```bash
curl -X POST http://localhost:8000/assess/unified \
  -H "Content-Type: application/json" \
  -d '{
    "damage_text": "Screen cracked",
    "device_brand": "Samsung",
    "device_model": "Galaxy A54",
    "device_age_years": 1,
    "device_type": "Smartphone",
    "price_php": 17000,
    "fetch_marketplace": true
  }'
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| POST | `/assess/unified` | Full assessment (text + image + marketplace) |
| POST | `/assess/text-only` | Text-only assessment with marketplace |
| GET | `/info/models` | Model metadata |
| GET | `/info/output-format` | Output schema documentation |

## Docker

```bash
docker build -t repair-ml:latest .
docker run -p 8000:8000 repair-ml:latest
```

## Retraining

```bash
python training/scripts/train_issue_classifier.py && python training/scripts/train_repairability_scorer.py
```

This loads data from `training/datasets/`, trains both models, and saves to `models/`.
