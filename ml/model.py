from pathlib import Path
from io import BytesIO

import torch
from PIL import Image
from torchvision import transforms
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights

IMAGE_SIZE = 128

_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def build_model(device: torch.device) -> torch.nn.Module:
    weights = MobileNet_V3_Small_Weights.DEFAULT
    model = mobileNet_v3_small(weights=weights)
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = torch.nn.Linear(in_features, 1)
    return model.to(device)


def load_model(weights_path: Path, device: torch.device | None = None) -> torch.nn.Module:
    device = device or torch.device('cpu')
    model = build_model(device)
    state = torch.load(weights_path, map_location=device)
    model.load_state_dict(state)
    model.eval()
    return model


def transform_image(image: Image.Image) -> torch.Tensor:
    image = image.convert('RGB')
    return _transform(image).unsqueeze(0)


def image_from_bytes(image_bytes: bytes) -> Image.Image:
    return Image.open(BytesIO(image_bytes))


def predict_bytes(image_bytes: bytes, model: torch.nn.Module, device: torch.device) -> dict:
    image = image_from_bytes(image_bytes)
    tensor = transform_image(image).to(device)
    with torch.inference_mode():
        logits = model(tensor)
        probability = torch.sigmoid(logits).item()

    return {
        'label': 'good' if probability >= 0.5 else 'not_good',
        'is_good': probability >= 0.5,
        'probability': float(probability),
    }


def predict_path(image_path: Path, model: torch.nn.Module, device: torch.device) -> dict:
    with open(image_path, 'rb') as f:
        return predict_bytes(f.read(), model, device)
