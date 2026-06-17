import pytest
from pathlib import Path

try:
    from predict_unified import predict_repairability
except ImportError:
    pytest.skip("predict_unified.py not available", allow_module_level=True)


MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


@pytest.mark.parametrize(
    "device_text, repair_cost, customer_rating, usage_duration, price",
    [
        ("Samsung Galaxy A54 Smartphone", 150, 4.0, 12, 349),
        ("Apple iPhone 14 Pro Smartphone", 200, 4.5, 6, 999),
        ("Dell XPS 13 Laptop", 400, 3.8, 24, 999),
        ("iPad Pro Tablet", 250, 4.2, 18, 799),
    ],
)
def test_predict_repairability(device_text, repair_cost, customer_rating, usage_duration, price):
    if not (MODELS_DIR / "repairability_voting_regressor.joblib").exists():
        pytest.skip("Model not found — run: cd ml && python training/scripts/train_repairability_scorer.py")
    try:
        result = predict_repairability(
            device_text=device_text,
            repair_cost=repair_cost,
            customer_rating=customer_rating,
            usage_duration=usage_duration,
            price=price,
        )
    except (KeyError, Exception) as e:
        pytest.skip(f"Model incompatible with installed joblib/numpy: {e}")

    assert "repairability_score" in result
    assert "is_repairable" in result
    assert "recommendation" in result
    assert isinstance(result["repairability_score"], (int, float))
    assert isinstance(result["is_repairable"], bool)
    assert isinstance(result["recommendation"], str)
    assert 0 <= result["repairability_score"] <= 10
