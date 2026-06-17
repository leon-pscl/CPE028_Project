import sys
from pathlib import Path

import pytest
import torch
from torchvision import transforms
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
DATASETS_DIR = Path(__file__).resolve().parent.parent / "training" / "datasets"
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


@pytest.fixture(scope="session")
def image_transform():
    """Shared preprocessing for all image models (matches training val_transform)."""
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])


def _load_image_model(filename, model_cls, num_classes):
    path = MODELS_DIR / filename
    if not path.exists():
        pytest.skip(f"{filename} not found — run training script first")
    model = model_cls(num_classes=num_classes)
    model.load_state_dict(torch.load(path, map_location="cpu", weights_only=True))
    model.eval()
    return model


@pytest.fixture(scope="session")
def crack_model():
    from predict_unified import CrackDetector
    return _load_image_model("crack_detector.pth", CrackDetector, 2)


@pytest.fixture(scope="session")
def corrosion_model():
    from predict_unified import CorrosionDetector
    return _load_image_model("corrosion_detector.pth", CorrosionDetector, 5)


@pytest.fixture(scope="session")
def component_model():
    from predict_unified import ImageClassifier
    return _load_image_model("image_classifier_laptop.pth", ImageClassifier, 10)


def _predict(model, image_path, image_transform):
    img = Image.open(image_path).convert("RGB")
    tensor = image_transform(img).unsqueeze(0)
    with torch.no_grad():
        output = model(tensor)
    return output.argmax(dim=1).item()


# --- NLP fixtures ---


@pytest.fixture(scope="session")
def issue_classifier():
    """Load issue classifier once per test session."""
    joblib_path = MODELS_DIR / "issue_classifier_voting.joblib"
    if not joblib_path.exists():
        pytest.skip("issue_classifier_voting.joblib not found — run: python training/scripts/train_issue_classifier.py")
    import joblib
    return joblib.load(joblib_path)


@pytest.fixture(scope="session")
def repairability_model():
    """Load repairability regressor once per test session."""
    joblib_path = MODELS_DIR / "repairability_voting_regressor.joblib"
    if not joblib_path.exists():
        pytest.skip("repairability_voting_regressor.joblib not found — run: python training/scripts/train_repairability_scorer.py")
    import joblib
    return joblib.load(joblib_path)


@pytest.fixture(scope="session")
def issue_sample_df():
    """Load and sample 100 rows from the issue test dataset."""
    csv_path = DATASETS_DIR / "pre_processed" / "processed_issue_dataset1.csv"
    if not csv_path.exists():
        pytest.skip("processed_issue_dataset1.csv not found")
    import pandas as pd
    df = pd.read_csv(csv_path)
    n = min(100, len(df))
    return df.sample(n, random_state=42)


@pytest.fixture(scope="session")
def repairability_sample_df():
    """Load and sample 100 rows from the repairability test dataset."""
    csv_path = DATASETS_DIR / "pre_processed" / "processed_repairability_dataset1.csv"
    if not csv_path.exists():
        pytest.skip("processed_repairability_dataset1.csv not found")
    import pandas as pd
    df = pd.read_csv(csv_path)
    n = min(100, len(df))
    return df.sample(n, random_state=42)
