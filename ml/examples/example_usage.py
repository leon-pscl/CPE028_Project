"""
Example usage of the trained ML models for damage assessment and repairability scoring.

This example shows how to use the predict.py module to:
1. Classify user input text to identify damage type
2. Score device repairability on 1-10 scale
3. Generate combined assessment with recommendations
"""

from predict import predict_issue_type, predict_repairability, combined_assessment
import json


def example_1_damage_classification():
    """Example 1: Classify user damage description"""
    print("=" * 70)
    print("EXAMPLE 1: Damage Type Classification")
    print("=" * 70)
    
    user_input = "I drop my phone a week ago then suddenly its slowing and also it has crack"
    result = predict_issue_type(user_input)
    print(f"\nUser Input: {user_input}")
    print(f"Predicted Issue Type: {result['predicted_label']}")
    print(f"Confidence: {result['confidence']}")
    print(json.dumps(result, indent=2))


def example_2_repairability_score():
    """Example 2: Score device repairability"""
    print("\n" + "=" * 70)
    print("EXAMPLE 2: Repairability Scoring")
    print("=" * 70)
    
    result = predict_repairability(
        device_text="Samsung Galaxy A54 Smartphone",
        device_source="user_input",
        repair_cost=150.0,
        customer_rating=4.2,
        usage_duration=12.0,
        price=349.0,
        battery_capacity=5000.0,
        weight=188.0,
    )
    print(f"\nDevice: {result['device_text']}")
    print(f"Repairability Score: {result['repairability_score']}/10")
    print(f"Is Repairable: {result['is_repairable']}")
    print(f"Recommendation: {result['recommendation']}")
    print(json.dumps(result, indent=2))


def example_3_combined_assessment():
    """Example 3: Combined damage + repairability assessment"""
    print("\n" + "=" * 70)
    print("EXAMPLE 3: Combined Damage + Repairability Assessment")
    print("=" * 70)
    
    result = combined_assessment(
        damage_text="My laptop screen has a large crack and the keyboard is also damaged from water exposure",
        device_brand="Dell",
        device_model="XPS 13",
        device_age_months=24,
        device_type="Laptop",
        repair_cost=400.0,
        price=999.0,
    )
    print("\n--- Damage Assessment ---")
    print(f"Issue Type: {result['damage_assessment']['predicted_label']}")
    print(f"Confidence: {result['damage_assessment']['confidence']}")
    
    print("\n--- Repairability Assessment ---")
    print(f"Repairability Score: {result['repairability_assessment']['repairability_score']}/10")
    print(f"Recommendation: {result['repairability_assessment']['recommendation']}")
    
    print("\n--- Overall Recommendation ---")
    print(result['overall_recommendation'])
    print(json.dumps(result, indent=2))


def example_4_multiple_devices():
    """Example 4: Assess multiple devices"""
    print("\n" + "=" * 70)
    print("EXAMPLE 4: Multiple Device Assessments")
    print("=" * 70)
    
    devices = [
        {
            "damage": "Battery doesn't hold charge and phone gets very hot",
            "brand": "iPhone",
            "model": "13",
            "age": 36,
            "type": "Smartphone",
            "cost": 80.0,
            "price": 799.0,
        },
        {
            "damage": "Touchpad not responding and one RAM stick failed",
            "brand": "Lenovo",
            "model": "ThinkPad E15",
            "age": 48,
            "type": "Laptop",
            "cost": 250.0,
            "price": 699.0,
        },
        {
            "damage": "Screen has minor scratches and button sticky",
            "brand": "Apple",
            "model": "iPad Air",
            "age": 18,
            "type": "Tablet",
            "cost": 120.0,
            "price": 599.0,
        },
    ]
    
    for i, device in enumerate(devices, 1):
        result = combined_assessment(
            damage_text=device["damage"],
            device_brand=device["brand"],
            device_model=device["model"],
            device_age_months=device["age"],
            device_type=device["type"],
            repair_cost=device["cost"],
            price=device["price"],
        )
        print(f"\nDevice {i}: {device['brand']} {device['model']} ({device['type']})")
        print(f"  Damage: {result['damage_assessment']['predicted_label']}")
        print(f"  Repairability: {result['repairability_assessment']['repairability_score']}/10")
        print(f"  Verdict: {result['overall_recommendation']}")


if __name__ == "__main__":
    try:
        example_1_damage_classification()
        example_2_repairability_score()
        example_3_combined_assessment()
        example_4_multiple_devices()
    except FileNotFoundError as e:
        print(f"ERROR: {e}")
        print("\nPlease run train_issue_classifier.py and train_repairability_scorer.py first to generate the model artifacts.")
