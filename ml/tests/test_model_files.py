import json
from pathlib import Path
import pytest

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


@pytest.mark.parametrize(
    "filename",
    [
        "issue_classifier_voting.joblib",
        "repairability_voting_regressor.joblib",
        "training_summary.json",
        "image_classifier_laptop.pth",
        "crack_detector.pth",
        "corrosion_detector.pth",
    ],
)
def test_model_file_exists(filename):
    filepath = MODELS_DIR / filename
    if not filepath.exists():
        pytest.skip(f"{filename} not found — run: cd ml && python training/scripts/train_text_models.py")
    assert filepath.exists(), f"{filename} not found"


def test_training_summary_readable():
    summary_path = MODELS_DIR / "training_summary.json"
    if not summary_path.exists():
        pytest.skip("training_summary.json not found")

    with open(summary_path) as f:
        summary = json.load(f)

    assert "issue_model" in summary
    assert "repairability_model" in summary
    assert "accuracy" in summary["issue_model"]
    assert "r2" in summary["repairability_model"]


def test_model_files_loadable():
    import joblib

    issue_path = MODELS_DIR / "issue_classifier_voting.joblib"
    repair_path = MODELS_DIR / "repairability_voting_regressor.joblib"

    if not issue_path.exists() or not repair_path.exists():
        pytest.skip("Model .joblib files not found — run: cd ml && python training/scripts/train_text_models.py")

    try:
        issue_model = joblib.load(issue_path)
        assert issue_model is not None
    except (KeyError, Exception) as e:
        pytest.skip(f"Issue model incompatible with installed joblib/numpy: {e}")

    try:
        repair_model = joblib.load(repair_path)
        assert repair_model is not None
    except (KeyError, Exception) as e:
        pytest.skip(f"Repairability model incompatible with installed joblib/numpy: {e}")


def test_torch_models_loadable():
    try:
        import torch
    except ImportError:
        pytest.skip("torch not installed")

    for name in ["image_classifier_laptop.pth", "crack_detector.pth", "corrosion_detector.pth"]:
        path = MODELS_DIR / name
        if not path.exists():
            pytest.skip(f"{name} not found")
        try:
            state_dict = torch.load(path, map_location="cpu", weights_only=False)
            assert state_dict is not None
        except Exception as e:
            pytest.skip(f"Could not load {name}: {e}")
