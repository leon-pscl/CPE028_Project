"""
Inference module for the trained ML models.
Provides two main prediction functions:
1. Identify damage type and repairability from user text input
2. Score overall repairability based on device specs and features
3. Integrate with marketplace API for real-time pricing
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd

# Import marketplace functions
try:
    from marketplace import get_market_prices
    MARKETPLACE_AVAILABLE = True
except ImportError:
    MARKETPLACE_AVAILABLE = False

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"


def load_issue_model():
    """Load the trained issue/damage classifier model."""
    model_path = MODEL_DIR / "issue_classifier_voting.joblib"
    if not model_path.exists():
        raise FileNotFoundError(f"Issue classifier model not found at {model_path}")
    return joblib.load(model_path)


def load_repairability_model():
    """Load the trained repairability regression model."""
    model_path = MODEL_DIR / "repairability_voting_regressor.joblib"
    if not model_path.exists():
        raise FileNotFoundError(f"Repairability model not found at {model_path}")
    return joblib.load(model_path)


def predict_issue_type(text_input: str) -> dict:
    """
    Predict the damage/issue type from user text input.
    
    Example input: "I drop my phone a week ago then suddenly its slowing and also it has crack"
    
    Returns:
        {
            "input": str,
            "predicted_label": str,
            "confidence": float
        }
    """
    model = load_issue_model()
    # The model expects a DataFrame with 'text_clean' and 'source' columns
    test_input = pd.DataFrame({
        "text_clean": [text_input.lower()],
        "source": ["user_input"]
    })
    prediction = model.predict(test_input)[0]
    
    # For confidence, get decision function or probabilities if available
    try:
        scores = model.decision_function(test_input)
        confidence = float(1.0 / (1.0 + abs(scores[0])))
    except AttributeError:
        confidence = 0.85  # Default confidence for hard voting
    
    return {
        "input": text_input,
        "predicted_label": str(prediction),
        "confidence": round(confidence, 4),
    }


def predict_repairability(
    device_text: str,
    device_source: str = "user_input",
    repair_cost: float = 0.0,
    customer_rating: float = 0.0,
    usage_duration: float = 0.0,
    price: float = 0.0,
    battery_capacity: float = 0.0,
    weight: float = 0.0,
) -> dict:
    """
    Predict the repairability score for a device (1-10 scale).
    
    Args:
        device_text: Description of the device (e.g., "Samsung Galaxy S21 smartphone")
        device_source: Source of the device info (default: "user_input")
        repair_cost: Estimated repair cost
        customer_rating: Customer satisfaction rating (1-5)
        usage_duration: How long the device has been used (months)
        price: Original device price
        battery_capacity: Battery capacity (mAh or Wh)
        weight: Device weight (grams)
    
    Returns:
        {
            "device_text": str,
            "repairability_score": float (1-10),
            "is_repairable": bool,
            "recommendation": str
        }
    """
    model = load_repairability_model()
    test_input = pd.DataFrame({
        "device_text_clean": [device_text.lower()],
        "source": [device_source],
        "repair_cost": [repair_cost],
        "customer_rating": [customer_rating],
        "usage_duration": [usage_duration],
        "price": [price],
        "battery_capacity": [battery_capacity],
        "weight": [weight],
    })
    
    prediction = model.predict(test_input)[0]
    score = float(min(max(prediction, 1.0), 10.0))  # Clamp to 1-10 range
    
    # Generate recommendation based on score
    if score >= 8.0:
        recommendation = "Highly repairable - parts readily available, low cost"
    elif score >= 6.0:
        recommendation = "Moderately repairable - some parts may be hard to find"
    elif score >= 4.0:
        recommendation = "Difficult to repair - parts scarce or costly"
    else:
        recommendation = "Not recommended for repair - consider replacement"
    
    return {
        "device_text": device_text,
        "repairability_score": round(score, 2),
        "is_repairable": score >= 5.0,
        "recommendation": recommendation,
    }


def combined_assessment(
    damage_text: str,
    device_brand: str = "",
    device_model: str = "",
    device_age_months: float = 0.0,
    device_type: str = "",
    repair_cost: float = 0.0,
    price: float = 0.0,
    fetch_marketplace: bool = True,
) -> dict:
    """
    Combined assessment: identify damage AND predict repairability.
    Optionally fetch real-time marketplace prices for replacement parts.
    
    Args:
        damage_text: User description of damage/issue
        device_brand: Device brand (e.g., "Samsung")
        device_model: Device model (e.g., "Galaxy S21")
        device_age_months: Age of device in months
        device_type: Device type (e.g., "Smartphone", "Laptop", "Tablet")
        repair_cost: Estimated repair cost
        price: Original device price
        fetch_marketplace: Whether to fetch real-time marketplace prices
    
    Returns:
        {
            "damage_assessment": {...},
            "repairability_assessment": {...},
            "marketplace_prices": [...],  # Real-time prices from Shopee/Lazada
            "overall_recommendation": str,
            "cost_analysis": {...}  # Estimated costs with marketplace data
        }
    """
    # Predict damage type
    damage_result = predict_issue_type(damage_text)
    
    # Build device description for repairability model
    device_desc = f"{device_brand} {device_model} {device_type}".strip()
    
    # Predict repairability
    repair_result = predict_repairability(
        device_text=device_desc,
        device_source="user_input",
        repair_cost=repair_cost,
        usage_duration=device_age_months,
        price=price,
    )
    
    # Fetch marketplace prices (async)
    marketplace_prices = []
    if fetch_marketplace and MARKETPLACE_AVAILABLE and device_brand and device_model:
        try:
            marketplace_prices = asyncio.run(
                get_market_prices(device_brand, device_model)
            )
        except Exception as e:
            # Gracefully handle marketplace API errors
            marketplace_prices = []
    
    # Calculate cost analysis
    cost_analysis = _analyze_repair_costs(
        repair_cost=repair_cost,
        device_price=price,
        marketplace_prices=marketplace_prices,
        repairability_score=repair_result["repairability_score"],
    )
    
    # Generate combined recommendation
    if damage_result["confidence"] > 0.7 and repair_result["is_repairable"]:
        overall = f"Device has {damage_result['predicted_label']} and is repairable. {repair_result['recommendation']}"
    elif damage_result["confidence"] > 0.7:
        overall = f"Device has {damage_result['predicted_label']} but is not recommended for repair due to cost."
    else:
        overall = "Unable to assess damage confidently. Recommend professional inspection."
    
    return {
        "damage_assessment": damage_result,
        "repairability_assessment": repair_result,
        "marketplace_prices": marketplace_prices,
        "cost_analysis": cost_analysis,
        "overall_recommendation": overall,
    }


def _analyze_repair_costs(
    repair_cost: float,
    device_price: float,
    marketplace_prices: list,
    repairability_score: float,
) -> dict:
    """Analyze and provide cost breakdown for repair decision"""
    
    # Calculate average marketplace price
    avg_marketplace_price = 0.0
    if marketplace_prices:
        prices = [p.get("price", 0) for p in marketplace_prices if p.get("price")]
        if prices:
            avg_marketplace_price = sum(prices) / len(prices)
    
    # Estimate total repair cost
    estimated_total = repair_cost + avg_marketplace_price if avg_marketplace_price else repair_cost
    
    # Calculate cost-benefit ratio
    if device_price > 0:
        repair_ratio = estimated_total / device_price
    else:
        repair_ratio = 0.0
    
    # Generate cost recommendation
    if estimated_total == 0:
        cost_rec = "Unable to estimate repair costs. Consult a technician."
    elif repair_ratio > 0.7:
        cost_rec = f"Repair cost (${estimated_total:.2f}) exceeds 70% of device value (${device_price:.2f}). Consider replacement."
    elif repair_ratio > 0.5:
        cost_rec = f"Repair cost (${estimated_total:.2f}) is moderate (50-70% of device value). Repair may be worthwhile."
    else:
        cost_rec = f"Repair cost (${estimated_total:.2f}) is reasonable (<50% of device value). Repair recommended."
    
    return {
        "estimated_repair_cost": round(estimated_total, 2),
        "estimated_parts_cost": round(avg_marketplace_price, 2),
        "labor_cost": round(repair_cost, 2),
        "device_value": round(device_price, 2),
        "repair_ratio": round(repair_ratio, 3),
        "recommendation": cost_rec,
    }



if __name__ == "__main__":
    # Test example
    test_damage = "I drop my phone a week ago then suddenly its slowing and also it has crack"
    result = combined_assessment(
        damage_text=test_damage,
        device_brand="Samsung",
        device_model="Galaxy A54",
        device_age_months=12,
        device_type="Smartphone",
        repair_cost=150.0,
        price=349.0,
    )
    print(json.dumps(result, indent=2))
