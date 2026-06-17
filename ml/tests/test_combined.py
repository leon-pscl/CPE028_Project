import pytest
from pathlib import Path

try:
    from predict_unified import combined_assessment_unified
except ImportError:
    pytest.skip("predict_unified.py not available", allow_module_level=True)


MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "damage_text, brand, model, age, dtype, price",
    [
        ("Screen cracked from drop, battery also seems to be getting worse", "Samsung", "Galaxy A54", 1, "Smartphone", 349),
        ("Water damage from spill, keyboard not responding", "Dell", "XPS 13", 2, "Laptop", 999),
        ("Touch screen intermittent, sometimes freezes", "Apple", "iPad Air", 1.5, "Tablet", 799),
    ],
)
async def test_combined_assessment(damage_text, brand, model, age, dtype, price):
    if not (MODELS_DIR / "issue_classifier_voting.joblib").exists():
        pytest.skip("Models not found — run: cd ml && python training/scripts/train_text_models.py")
    if not (MODELS_DIR / "repairability_voting_regressor.joblib").exists():
        pytest.skip("Models not found — run: cd ml && python training/scripts/train_text_models.py")
    try:
        result = await combined_assessment_unified(
            damage_text=damage_text,
            device_brand=brand,
            device_model=model,
            device_age_years=age,
            device_type=dtype,
            price_php=price,
            fetch_marketplace=False,
        )
    except (KeyError, Exception) as e:
        pytest.skip(f"Models incompatible with installed joblib/numpy: {e}")

    assert "damage_analysis" in result
    assert "repairability" in result
    assert "final_recommendation" in result
    assert "combined" in result["damage_analysis"]
    assert "predicted_label" in result["damage_analysis"].get("text", {})
    assert "repairability_index" in result["repairability"]
    assert isinstance(result["final_recommendation"]["decision"], str)
    assert len(result["final_recommendation"]["decision"]) > 0
