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
    ],
)
def test_model_file_exists(filename):
    filepath = MODELS_DIR / filename
    if not filepath.exists():
        pytest.skip(f"{filename} not found — run: cd ml && python train_text_models.py")
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
        pytest.skip("Model .joblib files not found — run: cd ml && python train_text_models.py")

    issue_model = joblib.load(issue_path)
    assert issue_model is not None

    repair_model = joblib.load(repair_path)
    assert repair_model is not None
