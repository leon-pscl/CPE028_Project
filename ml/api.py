from pathlib import Path
import os
import json
from typing import Optional

import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from marketplace import get_market_prices
from model import load_model, predict_bytes
from predict import (
    predict_issue_type,
    predict_repairability,
    combined_assessment,
)

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = BASE_DIR / 'models' / 'mobilenetv3_small_binary.pth'
MODEL_PATH = Path(os.getenv('ML_MODEL_PATH', str(DEFAULT_MODEL_PATH)))
if not MODEL_PATH.is_absolute():
    MODEL_PATH = (BASE_DIR / MODEL_PATH).resolve()
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

app = FastAPI(
    title="Rev.Tech ML API",
    description="ML-powered API for device damage assessment, repairability scoring, and image quality classification",
    version="2.0.0",
)

allowed_origin = os.getenv('VITE_WEB_URL', 'http://127.0.0.1:5173')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin, '*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


class PriceQuote(BaseModel):
    source: str
    title: str
    price: float
    currency: str
    url: str


class PredictionResponse(BaseModel):
    label: str
    is_good: bool
    probability: float
    market_prices: list[PriceQuote] = []


class IssueCheckRequest(BaseModel):
    text: str


class IssueCheckResponse(BaseModel):
    input: str
    predicted_label: str
    confidence: float


class RepairabilityRequest(BaseModel):
    device_text: str
    device_source: Optional[str] = "user_input"
    repair_cost: Optional[float] = 0.0
    customer_rating: Optional[float] = 0.0
    usage_duration: Optional[float] = 0.0
    price: Optional[float] = 0.0
    battery_capacity: Optional[float] = 0.0
    weight: Optional[float] = 0.0


class RepairabilityResponse(BaseModel):
    device_text: str
    repairability_score: float
    is_repairable: bool
    recommendation: str


class CombinedAssessmentRequest(BaseModel):
    damage_text: str
    device_brand: Optional[str] = ""
    device_model: Optional[str] = ""
    device_age_months: Optional[float] = 0.0
    device_type: Optional[str] = ""
    repair_cost: Optional[float] = 0.0
    price: Optional[float] = 0.0
    fetch_marketplace: Optional[bool] = True


class CombinedAssessmentResponse(BaseModel):
    damage_assessment: dict
    repairability_assessment: dict
    marketplace_prices: list = []
    cost_analysis: dict
    overall_recommendation: str


@app.on_event('startup')
def startup_event() -> None:
    if MODEL_PATH.exists():
        app.state.model = load_model(MODEL_PATH, DEVICE)
        app.state.device = DEVICE
        app.state.image_model_loaded = True
    else:
        app.state.image_model_loaded = False
        print(f"Image model not found at {MODEL_PATH}. /predict endpoint will be unavailable.")


@app.get("/health")
def health():
    status = {
        "status": "healthy",
        "device": str(DEVICE),
    }
    if app.state.image_model_loaded:
        status["image_model"] = str(MODEL_PATH.name)
    try:
        predict_issue_type("test")
        status["text_models"] = ["issue_classifier_voting.joblib", "repairability_voting_regressor.joblib"]
    except Exception:
        status["text_models"] = "not loaded"
    return status


@app.post('/predict', response_model=PredictionResponse)
async def predict(
    brand: str = Form(...),
    model: str = Form(...),
    file: UploadFile = File(...),
) -> PredictionResponse:
    if not app.state.image_model_loaded:
        raise HTTPException(status_code=503, detail='Image model not loaded. Train the model first.')
    if not brand.strip() or not model.strip():
        raise HTTPException(status_code=400, detail='Brand and model are required.')
    if file.content_type.split('/')[0] != 'image':
        raise HTTPException(status_code=400, detail='Only image uploads are supported.')
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail='No image file received.')
    prediction = predict_bytes(image_bytes, app.state.model, app.state.device)
    market_prices = await get_market_prices(brand.strip(), model.strip())
    return PredictionResponse(**prediction, market_prices=market_prices)


@app.post("/assess/issue", response_model=IssueCheckResponse)
def assess_issue(request: IssueCheckRequest):
    try:
        result = predict_issue_type(request.text)
        return IssueCheckResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Issue classification failed: {str(e)}")


@app.post("/assess/repairability", response_model=RepairabilityResponse)
def assess_repairability(request: RepairabilityRequest):
    try:
        result = predict_repairability(
            device_text=request.device_text,
            device_source=request.device_source,
            repair_cost=request.repair_cost,
            customer_rating=request.customer_rating,
            usage_duration=request.usage_duration,
            price=request.price,
            battery_capacity=request.battery_capacity,
            weight=request.weight,
        )
        return RepairabilityResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Repairability assessment failed: {str(e)}")


@app.post("/assess/combined", response_model=CombinedAssessmentResponse)
def assess_combined(request: CombinedAssessmentRequest):
    try:
        result = combined_assessment(
            damage_text=request.damage_text,
            device_brand=request.device_brand,
            device_model=request.device_model,
            device_age_months=request.device_age_months,
            device_type=request.device_type,
            repair_cost=request.repair_cost,
            price=request.price,
            fetch_marketplace=request.fetch_marketplace,
        )
        return CombinedAssessmentResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Combined assessment failed: {str(e)}")


@app.get("/info/models")
def get_model_info():
    summary_file = BASE_DIR / "models" / "training_summary.json"
    if summary_file.exists():
        with open(summary_file) as f:
            return json.load(f)
    return {"error": "Training summary not found. Run train_text_models.py first."}


@app.get("/info/schemas")
def get_schemas():
    return {
        "predict": {
            "request": {
                "brand": "string (form)",
                "model": "string (form)",
                "file": "image file (form)"
            },
            "response": PredictionResponse.model_json_schema()
        },
        "issue_check": {
            "request": IssueCheckRequest.model_json_schema(),
            "response": IssueCheckResponse.model_json_schema()
        },
        "repairability": {
            "request": RepairabilityRequest.model_json_schema(),
            "response": RepairabilityResponse.model_json_schema()
        },
        "combined": {
            "request": CombinedAssessmentRequest.model_json_schema(),
            "response": CombinedAssessmentResponse.model_json_schema()
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, log_level="info")
