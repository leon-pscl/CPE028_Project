from pathlib import Path
import os

import torch
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from marketplace import get_market_prices
from model import load_model, predict_bytes

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = BASE_DIR / 'models' / 'mobilenetv3_small_binary.pth'
MODEL_PATH = Path(os.getenv('ML_MODEL_PATH', str(DEFAULT_MODEL_PATH)))
if not MODEL_PATH.is_absolute():
    MODEL_PATH = (BASE_DIR / MODEL_PATH).resolve()
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

app = FastAPI(title='Image Quality Classifier')

# CORS: allow the frontend to call this service. Set VITE_WEB_URL in deployment.
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


@app.on_event('startup')
def startup_event() -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f'Model file not found at {MODEL_PATH}. Train the model first.')
    app.state.model = load_model(MODEL_PATH, DEVICE)
    app.state.device = DEVICE


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok', 'device': str(DEVICE), 'model_path': str(MODEL_PATH)}


@app.post('/predict', response_model=PredictionResponse)
async def predict(
    brand: str = Form(...),
    model: str = Form(...),
    file: UploadFile = File(...),
) -> PredictionResponse:
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


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('app:app', host='0.0.0.0', port=8000, reload=False)
