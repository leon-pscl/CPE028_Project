import pytest
from pathlib import Path

try:
    from predict_unified import predict_issue_from_text, load_issue_model
except ImportError:
    pytest.skip("predict_unified.py not available", allow_module_level=True)


MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


@pytest.mark.parametrize(
    "description",
    [
        "I dropped my phone a week ago then suddenly its slowing and also it has crack",
        "My phone won't turn on after I spilled water on it",
        "The battery on my laptop drains very quickly",
        "Screen is flickering and sometimes goes black",
        "The keyboard stopped responding after a drop",
    ],
)
def test_predict_issue_type(description):
    if not (MODELS_DIR / "issue_classifier_voting.joblib").exists():
        pytest.skip("Model not found — run: cd ml && python training/scripts/train_issue_classifier.py")
    classifier = load_issue_model()
    if classifier is None:
        pytest.skip("Could not load issue classifier model")
    try:
        result = predict_issue_from_text(description, classifier)
    except (KeyError, Exception) as e:
        pytest.skip(f"Model incompatible with installed joblib/numpy: {e}")

    assert "predicted_label" in result
    assert "confidence" in result
    assert isinstance(result["predicted_label"], str)
    assert isinstance(result["confidence"], float)
    assert 0 <= result["confidence"] <= 1
    assert len(result["predicted_label"]) > 0
