#!/usr/bin/env python3
"""
Comprehensive Test Suite for ML Models
Tests both the Issue Classifier and Repairability Regressor
"""

import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from predict import predict_issue_type, predict_repairability, combined_assessment


def test_issue_classifier():
    """Test the damage classifier model"""
    print("\n" + "="*70)
    print("TEST 1: ISSUE CLASSIFIER")
    print("="*70)
    
    test_cases = [
        "I drop my phone a week ago then suddenly its slowing and also it has crack",
        "My phone won't turn on after I spilled water on it",
        "The battery on my laptop drains very quickly",
        "Screen is flickering and sometimes goes black",
        "The keyboard stopped responding after a drop",
    ]
    
    print(f"\nTesting {len(test_cases)} damage descriptions...\n")
    
    all_passed = True
    for i, test_input in enumerate(test_cases, 1):
        try:
            result = predict_issue_type(test_input)
            print(f"Test {i}:")
            print(f"  Input: {test_input[:60]}...")
            print(f"  ✓ Predicted: {result['predicted_label']}")
            print(f"  ✓ Confidence: {result['confidence']:.2f}")
            print()
        except Exception as e:
            print(f"Test {i}: ✗ FAILED - {str(e)}\n")
            all_passed = False
    
    return all_passed


def test_repairability_scorer():
    """Test the repairability scoring model"""
    print("="*70)
    print("TEST 2: REPAIRABILITY SCORER")
    print("="*70)
    
    test_devices = [
        {
            "text": "Samsung Galaxy A54 Smartphone",
            "cost": 150,
            "rating": 4.0,
            "usage": 12,
            "price": 349,
        },
        {
            "text": "Apple iPhone 14 Pro Smartphone",
            "cost": 200,
            "rating": 4.5,
            "usage": 6,
            "price": 999,
        },
        {
            "text": "Dell XPS 13 Laptop",
            "cost": 400,
            "rating": 3.8,
            "usage": 24,
            "price": 999,
        },
        {
            "text": "iPad Pro Tablet",
            "cost": 250,
            "rating": 4.2,
            "usage": 18,
            "price": 799,
        },
    ]
    
    print(f"\nTesting {len(test_devices)} device repairability scores...\n")
    
    all_passed = True
    for i, device in enumerate(test_devices, 1):
        try:
            result = predict_repairability(
                device_text=device["text"],
                repair_cost=device["cost"],
                customer_rating=device["rating"],
                usage_duration=device["usage"],
                price=device["price"],
            )
            print(f"Test {i}: {device['text']}")
            print(f"  ✓ Score: {result['repairability_score']}/10")
            print(f"  ✓ Repairable: {result['is_repairable']}")
            print(f"  ✓ Recommendation: {result['recommendation']}")
            print()
        except Exception as e:
            print(f"Test {i}: ✗ FAILED - {str(e)}\n")
            all_passed = False
    
    return all_passed


def test_combined_assessment():
    """Test the combined damage + repairability assessment"""
    print("="*70)
    print("TEST 3: COMBINED ASSESSMENT (Damage + Repairability)")
    print("="*70)
    
    test_cases = [
        {
            "damage": "Screen cracked from drop, battery also seems to be getting worse",
            "brand": "Samsung",
            "model": "Galaxy A54",
            "age": 12,
            "type": "Smartphone",
            "cost": 150,
            "price": 349,
        },
        {
            "damage": "Water damage from spill, keyboard not responding",
            "brand": "Dell",
            "model": "XPS 13",
            "age": 24,
            "type": "Laptop",
            "cost": 400,
            "price": 999,
        },
        {
            "damage": "Touch screen intermittent, sometimes freezes",
            "brand": "Apple",
            "model": "iPad Air",
            "age": 18,
            "type": "Tablet",
            "cost": 250,
            "price": 799,
        },
    ]
    
    print(f"\nTesting {len(test_cases)} combined assessments...\n")
    
    all_passed = True
    for i, test_case in enumerate(test_cases, 1):
        try:
            result = combined_assessment(
                damage_text=test_case["damage"],
                device_brand=test_case["brand"],
                device_model=test_case["model"],
                device_age_months=test_case["age"],
                device_type=test_case["type"],
                repair_cost=test_case["cost"],
                price=test_case["price"],
            )
            print(f"Test {i}: {test_case['brand']} {test_case['model']}")
            print(f"  Damage Reported: {test_case['damage'][:50]}...")
            print(f"  ✓ Identified Damage: {result['damage_assessment']['predicted_label']}")
            print(f"    └─ Confidence: {result['damage_assessment']['confidence']:.2f}")
            print(f"  ✓ Repairability Score: {result['repairability_assessment']['repairability_score']}/10")
            print(f"  ✓ Recommendation: {result['overall_recommendation'][:60]}...")
            print()
        except Exception as e:
            print(f"Test {i}: ✗ FAILED - {str(e)}\n")
            all_passed = False
    
    return all_passed


def test_model_files():
    """Verify model files exist and are loadable"""
    print("="*70)
    print("TEST 4: MODEL FILE VALIDATION")
    print("="*70)
    
    models_dir = Path(__file__).parent / "models"
    
    required_files = [
        "issue_classifier_voting.joblib",
        "repairability_voting_regressor.joblib",
        "training_summary.json",
    ]
    
    print(f"\nChecking {len(required_files)} required model files...\n")
    
    all_passed = True
    for filename in required_files:
        filepath = models_dir / filename
        if filepath.exists():
            size_mb = filepath.stat().st_size / (1024*1024)
            print(f"  ✓ {filename} ({size_mb:.1f} MB)")
        else:
            print(f"  ✗ {filename} - NOT FOUND")
            all_passed = False
    
    # Load and display training summary
    summary_path = models_dir / "training_summary.json"
    if summary_path.exists():
        print("\n✓ Training Summary:")
        with open(summary_path) as f:
            summary = json.load(f)
        print(f"  - Issue Classifier Accuracy: {summary['issue_model']['accuracy']:.1%}")
        print(f"  - Issue Classifier Samples: {summary['issue_model']['sample_count']}")
        print(f"  - Repairability Regressor R²: {summary['repairability_model']['r2']:.4f}")
        print(f"  - Repairability Regressor MAE: {summary['repairability_model']['mae']:.4f}")
        print(f"  - Repairability Regressor Samples: {summary['repairability_model']['sample_count']}")
    
    return all_passed


def main():
    """Run all tests"""
    print("\n" + "#"*70)
    print("# ML MODEL COMPREHENSIVE TEST SUITE")
    print("#"*70)
    
    results = {
        "Model Files": test_model_files(),
        "Issue Classifier": test_issue_classifier(),
        "Repairability Scorer": test_repairability_scorer(),
        "Combined Assessment": test_combined_assessment(),
    }
    
    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print()
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name}: {status}")
        if not passed:
            all_passed = False
    
    print()
    if all_passed:
        print("✅ ALL TESTS PASSED - MODELS ARE WORKING CORRECTLY!")
    else:
        print("❌ SOME TESTS FAILED - CHECK OUTPUT ABOVE")
    
    print("\n" + "#"*70 + "\n")
    return 0 if all_passed else 1


if __name__ == "__main__":
    exit(main())
