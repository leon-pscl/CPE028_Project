"""End-to-end tests for the unified assessment pipeline.

Covers the full damage_text → recommendation flow through
predict_unified.combined_assessment_unified. Each parametrized case
exercises a different damage category and device type.
"""

import pytest
from pathlib import Path

try:
    from predict_unified import (
        combined_assessment_unified,
        predict_issue_from_text,
        load_issue_model,
        load_repairability_model,
    )
except ImportError:
    pytest.skip("predict_unified.py not available", allow_module_level=True)

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


def _require_models():
    """Skip the entire module if core joblib models are missing."""
    missing = []
    if not (MODELS_DIR / "issue_classifier_voting.joblib").exists():
        missing.append("issue_classifier_voting.joblib")
    if not (MODELS_DIR / "repairability_voting_regressor.joblib").exists():
        missing.append("repairability_voting_regressor.joblib")
    if missing:
        pytest.skip(
            f"Missing models: {', '.join(missing)}. "
            "Run: cd ml && python training/scripts/train_issue_classifier.py "
            "&& python training/scripts/train_repairability_scorer.py"
        )


# ── Module-level guard ──────────────────────────────────────────
pytestmark = pytest.mark.asyncio


# ── Parametrized cases ──────────────────────────────────────────
# Each tuple: (damage_text, brand, model, age_years, device_type, price_php, expected_direction)
CASES = [
    # Category coverage: Battery degradation
    (
        "Battery drains from 100% to 20% in 30 minutes, gets very hot",
        "Samsung", "Galaxy A54", 1, "Smartphone", 349,
        "REPAIR",
    ),
    # Category coverage: Cracked screen
    (
        "Screen cracked from drop, battery also seems to be getting worse",
        "Samsung", "Galaxy A54", 1, "Smartphone", 349,
        None,  # direction depends on age/severity combo
    ),
    # Category coverage: Water/Liquid damage
    (
        "Water damage from spill, keyboard not responding",
        "Dell", "XPS 13", 2, "Laptop", 999,
        None,
    ),
    # Category coverage: Software issue
    (
        "Phone keeps restarting on its own, screen goes black randomly",
        "Apple", "iPhone 14", 0.5, "Smartphone", 899,
        "REPAIR",
    ),
    # Category coverage: Hardware issue (old device)
    (
        "Touch screen intermittent, sometimes freezes",
        "Apple", "iPad Air", 1.5, "Tablet", 799,
        None,
    ),
    # Category coverage: Very old device → likely recycle
    (
        "Battery swells and screen lifts off the frame",
        "Samsung", "Galaxy S10", 5, "Smartphone", 599,
        "RECYCLE",
    ),
]


@pytest.mark.parametrize(
    "damage_text, brand, model_name, age, dtype, price, expected_direction",
    CASES,
    ids=[
        "battery-degradation",
        "cracked-screen",
        "water-damage",
        "software-issue",
        "hardware-age",
        "old-device-recycle",
    ],
)
async def test_combined_assessment(
    damage_text, brand, model_name, age, dtype, price, expected_direction
):
    _require_models()

    result = await combined_assessment_unified(
        damage_text=damage_text,
        device_brand=brand,
        device_model=model_name,
        device_age_years=age,
        device_type=dtype,
        price_php=price,
        fetch_marketplace=False,
    )

    # ── Top-level structure ──────────────────────────────────────
    assert "damage_analysis" in result, "Missing damage_analysis"
    assert "repairability" in result, "Missing repairability"
    assert "final_recommendation" in result, "Missing final_recommendation"

    # ── Damage analysis ──────────────────────────────────────────
    da = result["damage_analysis"]
    assert "combined" in da, "Missing damage_analysis.combined"
    combined = da["combined"]
    assert "damage_type" in combined, "Missing damage_type in combined"
    assert isinstance(combined["damage_type"], str)
    assert len(combined["damage_type"]) > 0, "damage_type is empty"

    # Text analysis should always be present when damage_text is provided
    assert "text" in da, "Missing text analysis"
    assert "predicted_label" in da["text"], "Missing predicted_label in text analysis"
    assert isinstance(da["text"]["predicted_label"], str)
    assert len(da["text"]["predicted_label"]) > 0

    # ── Repairability ────────────────────────────────────────────
    rep = result["repairability"]
    assert "repairability_index" in rep, "Missing repairability_index"
    idx = rep["repairability_index"]
    assert isinstance(idx, (int, float)), f"repairability_index must be numeric, got {type(idx)}"
    assert 0 <= idx <= 10, f"repairability_index {idx} outside [0, 10]"
    assert "recommendation" in rep, "Missing recommendation"
    assert isinstance(rep["recommendation"], str)
    assert len(rep["recommendation"]) > 0

    # ── Final recommendation ─────────────────────────────────────
    fr = result["final_recommendation"]
    assert "decision" in fr, "Missing decision"
    decision = fr["decision"]
    assert isinstance(decision, str), f"decision must be str, got {type(decision)}"
    assert len(decision) > 0, "decision is empty"

    # ── Direction (if deterministic for this input) ──────────────
    if expected_direction is not None:
        assert decision.upper() == expected_direction, (
            f"Expected {expected_direction}, got {decision}"
        )


# ── Standalone NLP tests ────────────────────────────────────────


def test_issue_classifier_predicts_valid_labels():
    """Issue classifier returns one of the known damage categories."""
    _require_models()
    classifier = load_issue_model()
    assert classifier is not None, "Could not load issue classifier"

    KNOWN_LABELS = {
        "Battery degradation", "Cracked screen", "Hardware issue",
        "Software issue", "Water/Liquid damage", "Unknown",
    }

    descriptions = [
        "My phone screen is cracked after dropping it",
        "Battery dies in 20 minutes, gets hot while charging",
        "Water spilled on laptop, keyboard doesn't work",
        "Phone keeps restarting randomly",
        "The charging port is loose and won't connect",
    ]

    for desc in descriptions:
        result = predict_issue_from_text(desc, classifier)
        label = result["predicted_label"]
        assert isinstance(label, str) and len(label) > 0, f"Empty label for: {desc}"
        assert 0 <= result["confidence"] <= 1, f"Bad confidence for: {desc}"
        assert label in KNOWN_LABELS, (
            f"Unexpected label '{label}' for: {desc}. "
            f"Expected one of {KNOWN_LABELS}"
        )


def test_combined_assessment_returns_marketplace_field():
    """Marketplace prices should be an empty list when fetch_marketplace=False."""
    _require_models()

    import asyncio

    result = asyncio.get_event_loop().run_until_complete(
        combined_assessment_unified(
            damage_text="Screen is cracked",
            device_brand="Samsung",
            device_model="Galaxy A54",
            device_age_years=1,
            device_type="Smartphone",
            price_php=349,
            fetch_marketplace=False,
        )
    )

    assert "marketplace_prices" in result, "Missing marketplace_prices"
    assert isinstance(result["marketplace_prices"], list)
    assert len(result["marketplace_prices"]) == 0, "Expected empty marketplace_prices when fetch_marketplace=False"
