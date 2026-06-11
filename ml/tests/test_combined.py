import pytest

try:
    from predict import combined_assessment
except ImportError:
    pytest.skip("predict.py not available", allow_module_level=True)


@pytest.mark.parametrize(
    "damage_text, brand, model, age, dtype, cost, price",
    [
        ("Screen cracked from drop, battery also seems to be getting worse", "Samsung", "Galaxy A54", 12, "Smartphone", 150, 349),
        ("Water damage from spill, keyboard not responding", "Dell", "XPS 13", 24, "Laptop", 400, 999),
        ("Touch screen intermittent, sometimes freezes", "Apple", "iPad Air", 18, "Tablet", 250, 799),
    ],
)
def test_combined_assessment(damage_text, brand, model, age, dtype, cost, price):
    result = combined_assessment(
        damage_text=damage_text,
        device_brand=brand,
        device_model=model,
        device_age_months=age,
        device_type=dtype,
        repair_cost=cost,
        price=price,
    )

    assert "damage_assessment" in result
    assert "repairability_assessment" in result
    assert "overall_recommendation" in result
    assert "predicted_label" in result["damage_assessment"]
    assert "repairability_score" in result["repairability_assessment"]
    assert isinstance(result["overall_recommendation"], str)
    assert len(result["overall_recommendation"]) > 0
