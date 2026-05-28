# ML Service for Image Quality Classification

This folder contains a PyTorch training script and a FastAPI inference service for classifying whether an image is "good" or "not good".

## What is included

- `train.py` — trains a MobileNetV3-Small binary classifier on the dataset.
- `model.py` — model construction, loading, and inference utilities.
- `app.py` — FastAPI service exposing `GET /health` and `POST /predict`.
- `models/` — directory for saved model weights and ONNX export.

## Recommended hyperparameters

- Model: `MobileNetV3-Small`
- Input Size: `128×128`
- Optimizer: `AdamW`
- Learning Rate: `1e-4`
- Batch Size: `32`
- Epochs: `20–30`
- Loss: `BCEWithLogitsLoss`
- Scheduler: `ReduceLROnPlateau`
- Early Stopping: `patience=5`

## Training

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Run training:

```bash
cd apps/ml
python train.py --data-root ../../devOps_Dataset/project_data --output-dir models --epochs 25
```

3. The best weights are saved to `apps/ml/models/mobilenetv3_small_binary.pth` and ONNX export is saved to `apps/ml/models/mobilenetv3_small_binary.onnx`.

## Serving predictions

1. Start the FastAPI service:

```bash
cd apps/ml
python app.py
```

2. Health check:

```bash
curl http://127.0.0.1:8000/health
```

3. Predict with an image file plus device details:

```bash
curl -F "brand=Samsung" -F "model=Galaxy A54" -F "file=@path/to/image.jpg" http://127.0.0.1:8000/predict
```

## Integration notes

- The service accepts `brand`, `model`, and screen image upload.
- It returns JSON with `label`, `is_good`, `probability`, and `market_prices`.
- `market_prices` contains matched Shopee and Lazada price quotes for the screen replacement.
- Use the returned `market_prices` list to display marketplace price suggestions in the web app.
