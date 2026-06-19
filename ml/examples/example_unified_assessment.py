"""
Example Usage: Unified ML Assessment Pipeline
==============================================

NEW UNIFIED SYSTEM:
- Input: Text + Image + Device Info
- Process: Combined NLP + Image classification + Repairability scoring
- Output: Damage type + Repairability index + Price with ₱600 labor fee

KEY CHANGES:
1. Device age in YEARS (not months) - if 10+ years old → no stock available
2. Fixed labor fee: ₱600
3. Price in Philippine Peso (PHP)
4. Output includes repairability_index (0-100) instead of score
"""

import json
from pathlib import Path
from predict_unified import combined_assessment_unified


def print_assessment(assessment):
    """Pretty print assessment results"""
    
    print("\n" + "="*80)
    print("UNIFIED DEVICE REPAIR ASSESSMENT")
    print("="*80)
    
    # Device Info
    device = assessment["device_info"]
    print(f"\n📱 DEVICE INFORMATION")
    print(f"   Brand: {device['brand']}")
    print(f"   Model: {device['model']}")
    print(f"   Age: {device['age_years']} years")
    print(f"   Type: {device['type']}")
    print(f"   Original Price: ₱{device['original_price_php']:,.0f}")
    
    # Damage Analysis
    damage = assessment["damage_analysis"]
    print(f"\n🔍 DAMAGE ANALYSIS")
    if "text" in damage and damage["text"]:
        text_analysis = damage["text"]
        print(f"   Text Analysis:")
        print(f"     Damage Type: {text_analysis.get('predicted_label', 'N/A')}")
        print(f"     Confidence: {text_analysis.get('confidence', 0):.1%}")
    
    if "image" in damage and damage["image"]:
        image_analysis = damage["image"]
        print(f"   Image Analysis:")
        print(f"     Component: {image_analysis.get('predicted_component', 'N/A')}")
        print(f"     Confidence: {image_analysis.get('confidence', 0):.1%}")
    
    if "cracks" in damage and damage["cracks"]:
        crack_analysis = damage["cracks"]
        print(f"   Crack Detection:")
        print(f"     Status: {crack_analysis.get('classification', 'unknown')}")
        print(f"     Confidence: {crack_analysis.get('confidence', 0):.1%}")
    
    if "corrosion" in damage and damage["corrosion"]:
        corr_analysis = damage["corrosion"]
        print(f"   Corrosion Detection:")
        print(f"     Level: {corr_analysis.get('corrosion_level', 'N/A')}")
        print(f"     Confidence: {corr_analysis.get('confidence', 0):.1%}")
    
    combined = damage.get("combined", {})
    print(f"   Combined Damage Type: {combined.get('damage_type', 'Unknown')}")
    print(f"   Combined Confidence: {combined.get('combined_confidence', 0):.1%}")
    
    # Damaged Components
    if "damaged_components" in damage:
        components = damage["damaged_components"]
        print(f"\n   🔧 Damaged Components to Repair:")
        for comp in components:
            print(f"      • {comp.title()}")
    
    # Repairability
    repair = assessment["repairability"]
    print(f"\n🔧 REPAIRABILITY ASSESSMENT")
    print(f"   Repairability Index: {repair['repairability_index']:.0f}/100")
    print(f"   Is Repairable: {'✅ Yes' if repair['is_repairable'] else '❌ No'}")
    if repair.get("age_warning"):
        print(f"   ⚠️  WARNING: Device is 10+ years old - No stock available!")
    print(f"   Reason: {repair['reason']}")
    
    # Pricing
    pricing = assessment["pricing"]
    print(f"\n💰 PRICING BREAKDOWN")
    print(f"   Labor Fee (Fixed): ₱{pricing['labor_fee_php']:.0f}")
    print(f"   Estimated Parts Cost: ₱{pricing['estimated_parts_cost_php']:,.0f}")
    print(f"   Total Repair Cost: ₱{pricing['total_repair_cost_php']:,.0f}")
    print(f"   Device Value: ₱{pricing['original_device_price_php']:,.0f}")
    print(f"   Repair Ratio: {pricing['repair_ratio']:.1%}")
    print(f"   Price Assessment: {pricing['price_recommendation']}")
    
    # Marketplace (if available)
    marketplace = assessment.get("marketplace_prices", [])
    if marketplace:
        print(f"\n🛒 REPLACEMENT PARTS - MARKETPLACE LINKS")
        print(f"   Found {len(marketplace)} options for the damaged components:")
        
        # Group by component
        components_dict = {}
        for item in marketplace:
            comp = item.get('component', 'part')
            if comp not in components_dict:
                components_dict[comp] = []
            components_dict[comp].append(item)
        
        for component, items in components_dict.items():
            print(f"\n   {component.upper()} REPLACEMENT:")
            for i, item in enumerate(items[:2], 1):  # Show top 2 options per component
                print(f"      Option {i}: {item.get('source', 'Unknown')}")
                print(f"      Product: {item.get('title', 'N/A')}")
                price = item.get('price_php') or item.get('price')
                if price:
                    print(f"      Price: ₱{price:,.0f}")
                print(f"      Link: {item.get('url', 'N/A')}")
                print()
    else:
        if "marketplace_for_repair" in damage:
            info = damage["marketplace_for_repair"]
            print(f"\n🛒 REPLACEMENT PARTS")
            print(f"   {info['note']}")
            print(f"   Components needed: {', '.join(info['components'])}")
    
    # Final Recommendation
    final = assessment["final_recommendation"]
    print(f"\n📋 FINAL RECOMMENDATION")
    print(f"   Decision: {final['decision']}")
    print(f"   Explanation: {final['explanation']}")
    print(f"   Estimated Total Cost: ₱{final['estimated_total_cost_php']:,.0f}")
    print(f"   Damage Type: {final['damage_type']}")
    print(f"   Repairability Score: {final['repairability_index']:.0f}/100")
    
    print("\n" + "="*80 + "\n")


# ============ EXAMPLES ============

def example_1_recent_laptop_cracked_screen():
    """Example 1: Recent laptop with cracked screen"""
    print("EXAMPLE 1: Recent Dell Laptop - Cracked Screen (WITH MARKETPLACE PRICING)")
    print("-" * 60)
    
    result = combined_assessment_unified(
        damage_text="My laptop screen is completely cracked. Started after I dropped it.",
        image_path=None,  # Would be path to damage photo
        device_brand="Dell",
        device_model="XPS 13",
        device_age_years=3,  # 3 years old
        device_type="Laptop",
        price_php=50000,  # ₱50,000 original price
        fetch_marketplace=True  # 🎯 FETCH REAL-TIME MARKETPLACE PRICES
    )
    
    print_assessment(result)


def example_2_old_hp_laptop():
    """Example 2: Old HP laptop - 12 years old"""
    print("EXAMPLE 2: Old HP Laptop - 12+ Years Old")
    print("-" * 60)
    
    result = combined_assessment_unified(
        damage_text="Laptop battery not charging and some keys are stuck",
        image_path=None,
        device_brand="HP",
        device_model="Pavilion dv6",
        device_age_years=12,  # 12 years old → NO STOCK!
        device_type="Laptop",
        price_php=15000,  # ₱15,000 (old device)
        fetch_marketplace=False
    )
    
    print_assessment(result)


def example_3_samsung_phone_water_damage():
    """Example 3: Recent Samsung phone with water damage"""
    print("EXAMPLE 3: Samsung Phone - Water Damage (MARKETPLACE PRICING ENABLED)")
    print("-" * 60)
    
    result = combined_assessment_unified(
        damage_text="Phone got wet and now the screen is showing lines, barely responds",
        image_path=None,
        device_brand="Samsung",
        device_model="Galaxy A54",
        device_age_years=1,  # 1 year old
        device_type="Smartphone",
        price_php=15000,  # ₱15,000
        fetch_marketplace=True  # 🎯 ENABLE DYNAMIC MARKETPLACE PRICING
    )
    
    print_assessment(result)


def example_4_macbook_keyboard_issue():
    """Example 4: MacBook with keyboard issue"""
    print("EXAMPLE 4: Apple MacBook - Keyboard Issue")
    print("-" * 60)
    
    result = combined_assessment_unified(
        damage_text="Several keys on keyboard are not responding, spacebar sticks",
        image_path=None,
        device_brand="Apple",
        device_model="MacBook Pro 15",
        device_age_years=5,  # 5 years old
        device_type="Laptop",
        price_php=80000,  # ₱80,000
        fetch_marketplace=False
    )
    
    print_assessment(result)


def example_5_with_image():
    """Example 5: Assessment with image (if image available)"""
    print("EXAMPLE 5: Assessment WITH Image + MARKETPLACE PRICING")
    print("-" * 60)
    
    # Note: Replace with actual image path if available
    image_path = None  # "path/to/broken_laptop_screen.jpg"
    
    result = combined_assessment_unified(
        damage_text="Laptop screen is cracked and flickering",
        image_path=image_path,  # Optional image
        device_brand="Asus",
        device_model="VivoBook 15",
        device_age_years=2,
        device_type="Laptop",
        price_php=35000,  # ₱35,000
        fetch_marketplace=True  # 🎯 FETCH REAL-TIME PRICES FROM SHOPEE + LAZADA
    )
    
    print_assessment(result)


def example_api_usage():
    """Show how to use via API"""
    print("API USAGE EXAMPLES")
    print("-" * 60)
    print("""
1. TEXT-ONLY ASSESSMENT (Quick):
   
   curl -X POST http://localhost:8000/assess/text-only \\
     -H "Content-Type: application/json" \\
     -d '{
       "damage_text": "Screen is cracked",
       "device_brand": "Samsung",
       "device_model": "Galaxy A54",
       "device_age_years": 2,
       "device_type": "Smartphone",
       "price_php": 15000
     }'


2. UNIFIED ASSESSMENT WITH IMAGE:
   
   curl -X POST http://localhost:8000/assess/unified \\
     -F "damage_text=Laptop screen cracked" \\
     -F "device_brand=Dell" \\
     -F "device_model=XPS 13" \\
     -F "device_age_years=3" \\
     -F "device_type=Laptop" \\
     -F "price_php=50000" \\
     -F "image=@/path/to/broken_screen.jpg"


3. PYTHON USAGE:
   
   import requests
   
   response = requests.post(
       'http://localhost:8000/assess/text-only',
       json={
           'damage_text': 'Screen is cracked',
           'device_brand': 'Samsung',
           'device_model': 'Galaxy A54',
           'device_age_years': 2,
           'device_type': 'Smartphone',
           'price_php': 15000
       }
   )
   
   assessment = response.json()
   print(assessment['final_recommendation']['decision'])


4. PYTHON WITH IMAGE:
   
   import requests
   
   with open('damage_photo.jpg', 'rb') as img:
       files = {'image': img}
       data = {
           'damage_text': 'Laptop screen cracked',
           'device_brand': 'Dell',
           'device_model': 'XPS 13',
           'device_age_years': 3,
           'device_type': 'Laptop',
           'price_php': 50000
       }
       response = requests.post(
           'http://localhost:8000/assess/unified',
           files=files,
           data=data
       )
   
   assessment = response.json()
   print(assessment['final_recommendation'])
""")


def example_output_json():
    """Show example JSON output"""
    print("\nEXAMPLE JSON OUTPUT")
    print("-" * 60)
    
    result = combined_assessment_unified(
        damage_text="Screen is cracked",
        device_brand="Samsung",
        device_model="Galaxy A54",
        device_age_years=2,
        device_type="Smartphone",
        price_php=15000,
        fetch_marketplace=False
    )
    
    print(json.dumps(result, indent=2, default=str))


# ============ MAIN ============

if __name__ == "__main__":
    print("\n")
    print("╔" + "="*78 + "╗")
    print("║" + "UNIFIED DEVICE REPAIR ASSESSMENT EXAMPLES".center(78) + "║")
    print("║" + "ML Model + Image Classification + Repairability Scoring".center(78) + "║")
    print("║" + "WITH DYNAMIC MARKETPLACE PRICING".center(78) + "║")
    print("╚" + "="*78 + "╝")
    
    # Run examples
    example_1_recent_laptop_cracked_screen()
    example_2_old_hp_laptop()
    example_3_samsung_phone_water_damage()
    example_4_macbook_keyboard_issue()
    example_5_with_image()
    
    # Show API usage
    example_api_usage()
    
    # Show sample JSON
    example_output_json()
    
    print("\n" + "="*80)
    print("🎯 MARKETPLACE PRICING INTEGRATION")
    print("="*80)
    print("""
WHAT IT DOES:
✅ Fetches real-time prices from Shopee Philippines
✅ Fetches prices from Lazada Philippines  
✅ Uses average price for parts cost calculation
✅ Dynamically calculates total repair cost (parts + ₱600 labor)
✅ Makes smart repair vs replace recommendation based on price

HOW IT WORKS:

1. User input includes:
   - Device brand + model (e.g., "Dell XPS 13")
   - Description of damage
   - Original device price (₱)

2. System does:
   - Search marketplace: "Dell XPS 13 screen replacement"
   - Find multiple price options from Shopee & Lazada
   - Calculate average price
   - Add fixed ₱600 labor fee
   - Calculate total repair cost

3. Cost analysis:
   - If total < 50% of device price → ✅ REPAIR RECOMMENDED
   - If total 50-70% → ⚠️ CONSIDER BOTH OPTIONS
   - If total > 70% → ❌ RECOMMEND REPLACEMENT

EXAMPLE OUTPUT:

marketplace_prices: [
  {
    "source": "Shopee",
    "title": "Dell XPS 13 Screen Replacement",
    "price": 8500,
    "currency": "PHP",
    "url": "https://shopee.ph/..."
  },
  {
    "source": "Lazada",
    "title": "Dell XPS 13 LCD Display",
    "price": 8200,
    "currency": "PHP",
    "url": "https://lazada.com.ph/..."
  }
]

pricing: {
  "labor_fee_php": 600,
  "estimated_parts_cost_php": 8350,  ← Average of marketplace prices
  "total_repair_cost_php": 8950,     ← Parts + Labor
  "original_device_price_php": 50000,
  "repair_ratio": 0.179,             ← 8950 / 50000 = 17.9%
  "price_recommendation": "Repair cost is reasonable"
}

final_recommendation: {
  "decision": "✅ REPAIR RECOMMENDED",
  "explanation": "Repair cost (₱8,950) is reasonable (<50% of device value)",
  "estimated_total_cost_php": 8950
}

ENABLING MARKETPLACE:

In Python:
    result = combined_assessment_unified(
        damage_text="...",
        device_brand="Dell",
        device_model="XPS 13",
        price_php=50000,
        fetch_marketplace=True  ← Set to True
    )

In API call:
    curl -X POST http://localhost:8000/assess/text-only \\
      -H "Content-Type: application/json" \\
      -d '{
        "damage_text": "...",
        "device_brand": "Dell",
        "device_model": "XPS 13",
        "price_php": 50000,
        "fetch_marketplace": true
      }'

PERFORMANCE:
⏱️ Marketplace fetch: 10-20 seconds (runs asynchronously)
⏱️ Total assessment: 200-300ms (without marketplace)
                    10-20 seconds (with marketplace)

FALLBACK:
✅ If marketplace APIs fail or timeout:
   - System still returns assessment
   - Parts cost defaults to 0 (labor only)
   - Returns empty marketplace_prices array
   - User still gets repair recommendation
""")
    
    print("\n" + "="*80)
    print("KEY DIFFERENCES FROM OLD SYSTEM:")
    print("="*80)
    print("""
✅ NEW FEATURES:
   1. Image classification support (laptop components)
   2. Combined NLP + Image analysis
   3. Fixed labor fee: ₱600 PHP
   4. Age-based logic: 10+ years → no stock
   5. Repairability index (0-100) instead of score
   6. All prices in Philippine Peso (PHP)
   7. DYNAMIC MARKETPLACE PRICING ← NEW!

📊 INPUT CHANGES:
   OLD: device_age_months (months)
   NEW: device_age_years (years)
   
   OLD: price (USD)
   NEW: price_php (Philippine Peso)
   
   NEW: image_path (optional image file)
   NEW: fetch_marketplace (bool) ← NEW!

📈 OUTPUT CHANGES:
   OLD: repairability_score (1-10)
   NEW: repairability_index (0-100)
   
   NEW: marketplace_prices array (with real prices) ← NEW!
   NEW: detailed damage_analysis with text + image results
   NEW: pricing breakdown with ₱600 labor fee
   NEW: final_recommendation with decision & explanation

💡 BUSINESS LOGIC:
   • If device age >= 10 years:
     - Assume NO stock available
     - Repair NOT recommended
     - Return early with warning
   
   • Labor fee: Always ₱600
   
   • Marketplace enabled by default:
     - Fetches from Shopee & Lazada
     - Uses average price for calculation
     - Falls back gracefully if unavailable
   
   • Pricing tiers:
     - <50% of device value → Repair recommended
     - 50-70% → Marginal (consider both options)
     - >70% → Recommend replacement
""")
    
    print("\nTo start the API server:")
    print("  python ml/api_integration_unified.py")
    print("\nOr with Uvicorn:")
    print("  uvicorn ml.api_integration_unified:app --reload")
