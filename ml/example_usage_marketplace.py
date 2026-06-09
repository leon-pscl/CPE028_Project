"""
Example Usage: ML-Powered Device Repair Assessment with Marketplace Integration
================================================================================

This script demonstrates how to use the combined assessment API that includes:
1. Damage Type Classification (NLP)
2. Repairability Scoring (ML)
3. Real-time Marketplace Pricing (Shopee + Lazada)
4. Cost-Benefit Analysis

Run this script to see the full assessment pipeline in action.
"""

import asyncio
import json
from predict import combined_assessment


def print_assessment(assessment_result):
    """Pretty print assessment results"""
    print("\n" + "=" * 80)
    print("DEVICE REPAIR ASSESSMENT REPORT")
    print("=" * 80)
    
    # Damage Assessment
    damage = assessment_result["damage_assessment"]
    print(f"\n📱 DAMAGE ASSESSMENT")
    print(f"   Identified Damage: {damage['predicted_label']}")
    print(f"   Confidence: {damage['confidence']:.1%}")
    
    # Repairability Assessment
    repair = assessment_result["repairability_assessment"]
    print(f"\n🔧 REPAIRABILITY ANALYSIS")
    print(f"   Repairability Score: {repair['repairability_score']:.1f}/10")
    print(f"   Can Be Repaired: {'Yes' if repair['is_repairable'] else 'No'}")
    print(f"   Assessment: {repair['recommendation']}")
    
    # Marketplace Pricing
    marketplace = assessment_result.get("marketplace_prices", [])
    if marketplace:
        print(f"\n💰 MARKETPLACE REPLACEMENT PARTS")
        print(f"   Found {len(marketplace)} options on Shopee/Lazada:")
        for i, item in enumerate(marketplace, 1):
            print(f"\n   {i}. {item['source']}")
            print(f"      Product: {item['title']}")
            print(f"      Price: {item['currency']} {item['price']:.2f}")
            print(f"      Link: {item['url']}")
    else:
        print(f"\n💰 MARKETPLACE PRICING")
        print(f"   Marketplace data not available (disabled for quick demo)")
    
    # Cost Analysis
    cost = assessment_result.get("cost_analysis", {})
    if cost:
        print(f"\n💵 COST ANALYSIS & RECOMMENDATION")
        print(f"   Estimated Parts Cost: ${cost['estimated_parts_cost']:.2f}")
        print(f"   Labor Cost: ${cost['labor_cost']:.2f}")
        print(f"   Total Repair Cost: ${cost['estimated_repair_cost']:.2f}")
        print(f"   Original Device Value: ${cost['device_value']:.2f}")
        print(f"   Repair Ratio: {cost['repair_ratio']:.1%}")
        print(f"   → {cost['recommendation']}")
    
    # Overall Recommendation
    print(f"\n🎯 OVERALL RECOMMENDATION")
    print(f"   {assessment_result['overall_recommendation']}")
    print("\n" + "=" * 80 + "\n")


def example_1_cracked_screen():
    """Example 1: Cracked screen on recent phone"""
    print("EXAMPLE 1: Cracked Screen on Recent Phone")
    print("-" * 50)
    
    result = combined_assessment(
        damage_text="My phone screen is cracked and I can see a few dead pixels",
        device_brand="Samsung",
        device_model="Galaxy A54",
        device_age_months=8,
        device_type="Smartphone",
        repair_cost=150.0,  # Technician quote
        price=349.0,        # Original purchase price
        fetch_marketplace=False  # Set to True to fetch real-time prices
    )
    
    print_assessment(result)


def example_2_old_laptop():
    """Example 2: Battery issue on aging laptop"""
    print("EXAMPLE 2: Battery Degradation on Older Laptop")
    print("-" * 50)
    
    result = combined_assessment(
        damage_text="Laptop battery only lasts 1 hour and sometimes shuts down unexpectedly",
        device_brand="Dell",
        device_model="XPS 13",
        device_age_months=48,  # 4 years old
        device_type="Laptop",
        repair_cost=200.0,     # Battery + installation
        price=1299.0,
        fetch_marketplace=False
    )
    
    print_assessment(result)


def example_3_water_damage():
    """Example 3: Water damage assessment"""
    print("EXAMPLE 3: Water Damage on Tablet")
    print("-" * 50)
    
    result = combined_assessment(
        damage_text="Tablet got wet and display is flickering, randomly touches wrong areas",
        device_brand="Apple",
        device_model="iPad Pro 11-inch",
        device_age_months=24,
        device_type="Tablet",
        repair_cost=300.0,     # Complex repair
        price=999.0,
        fetch_marketplace=False
    )
    
    print_assessment(result)


def example_4_with_marketplace():
    """Example 4: Full assessment WITH marketplace pricing (SLOWER)"""
    print("EXAMPLE 4: Samsung Phone with Real-time Marketplace Pricing")
    print("-" * 50)
    print("⏳ Fetching latest prices from Shopee and Lazada...")
    print("   (This may take 10-20 seconds)")
    print()
    
    result = combined_assessment(
        damage_text="Phone screen is cracked and backing glass is broken",
        device_brand="Samsung",
        device_model="Galaxy S21",
        device_age_months=18,
        device_type="Smartphone",
        repair_cost=200.0,     # Screen + back replacement
        price=899.0,
        fetch_marketplace=True  # ✨ ENABLED - fetches real Shopee/Lazada prices
    )
    
    print_assessment(result)


def example_api_usage():
    """Example: Using via REST API"""
    print("EXAMPLE 5: Using via REST API")
    print("-" * 50)
    print("""
# Using curl:
curl -X POST http://localhost:8000/assess/combined \\
  -H "Content-Type: application/json" \\
  -d '{
    "damage_text": "Screen is cracked and battery drains fast",
    "device_brand": "Samsung",
    "device_model": "Galaxy A54",
    "device_age_months": 12,
    "device_type": "Smartphone",
    "repair_cost": 150.0,
    "price": 349.0,
    "fetch_marketplace": true
  }'

# Using Python requests:
import requests

response = requests.post(
    'http://localhost:8000/assess/combined',
    json={
        'damage_text': 'Screen is cracked',
        'device_brand': 'Samsung',
        'device_model': 'Galaxy A54',
        'device_age_months': 12,
        'device_type': 'Smartphone',
        'repair_cost': 150.0,
        'price': 349.0,
        'fetch_marketplace': True
    }
)

assessment = response.json()
print(assessment['overall_recommendation'])
""")


if __name__ == "__main__":
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 78 + "║")
    print("║" + "  ML-Powered Device Repair Assessment with Marketplace Integration".center(78) + "║")
    print("║" + " " * 78 + "║")
    print("╚" + "=" * 78 + "╝")
    print("\n")
    
    # Run examples
    example_1_cracked_screen()
    example_2_old_laptop()
    example_3_water_damage()
    
    # Ask if user wants to fetch real marketplace prices (slower)
    try:
        print("\n" + "=" * 80)
        print("OPTIONAL: Fetch Real Marketplace Prices?")
        print("=" * 80)
        print("""
The above examples ran QUICKLY with marketplace pricing disabled.

Example 4 will fetch REAL prices from Shopee and Lazada (takes 10-20 seconds):
- Actual screen replacement prices
- Real links to products
- Multiple vendor options

Run Example 4? (y/n): """)
        
        # For automation, comment this out or change to 'n'
        # response = input().strip().lower()
        response = 'n'  # Default: skip marketplace fetch
        
        if response == 'y':
            example_4_with_marketplace()
        else:
            print("⏭️  Skipped Example 4 (marketplace pricing)")
    except:
        pass
    
    # Show API usage
    print("\n")
    example_api_usage()
    
    print("\n" + "=" * 80)
    print("📚 DOCUMENTATION")
    print("=" * 80)
    print("""
ML Model Details:
  - Issue Classifier: 98.8% accuracy on 4000 training samples
  - Repairability Scorer: R² = 0.8763 on 6548 devices
  - Training time: ~2-3 minutes (optimized for speed)

Marketplace Sources:
  - Shopee: Direct API access
  - Lazada: Web scraping
  - Timeout: 20 seconds per source

Cost Analysis:
  - Uses marketplace average price for parts cost
  - Includes labor cost estimate
  - Calculates repair-to-value ratio
  - Provides recommendation based on 50%/70% thresholds

For more info, see:
  - ml/MODEL_TRAINING_GUIDE.md
  - ml/DEPLOYMENT_GUIDE.md
  - docs/ml/INTEGRATION_MARKETPLACE.md
""")
