"""
Updated ML Pipeline: Image Classification + Unified Assessment
===============================================================

NEW PIPELINE (Unified):
1. NLP Classifier - Damage type from user description
2. Image Classifier - Damage type from image
3. Repairability Scorer - Combined assessment

NEW I/O:
- Input: User description + Image + Device info (age, model, brand)
- Output: Repairability index + Damage type + Price (with 600 pesos labor)

NEW BUSINESS LOGIC:
- If age >= 10 years: No stock available, assume not repairable
- Fixed labor fee: 600 PHP
- Smart pricing recommendation
"""

import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Tuple, Optional
import asyncio
import cv2
from PIL import Image
import torch
import torch.nn as nn
from torchvision import models, transforms
import warnings

warnings.filterwarnings('ignore')

# Constants
LABOR_FEE_PHP = 600  # Fixed labor cost in Philippine Peso
NO_STOCK_AGE_THRESHOLD = 10  # Years - if older, assume no stock
MODEL_PATH = Path(__file__).parent / "models"
DAMAGE_CATEGORIES = [
    "Battery degradation",
    "Cracked screen",
    "Water damage",
    "Hardware failure",
    "Software issues",
    "Physical damage"
]

# Common laptop components for image classification
LAPTOP_COMPONENTS = [
    "Battery",
    "LCDScreen",
    "Keyboard",
    "Hinge",
    "Motherboard",
    "HardDiskDrive",
    "RAM",
    "Processor",
    "WebCam",
    "TouchPad"
]

# Try to import marketplace module
try:
    from ml.marketplace import get_market_prices
    MARKETPLACE_AVAILABLE = True
except ImportError:
    MARKETPLACE_AVAILABLE = False


def identify_damaged_components(damage_text: str, crack_analysis: Dict = None, corrosion_analysis: Dict = None, image_analysis: Dict = None) -> list:
    """
    Identify which specific components are damaged based on all analysis
    
    Returns list of damaged components to search marketplace for:
    Example: ["screen", "battery"] or ["keyboard"]
    """
    damaged_components = set()
    
    # Check text for common component mentions
    text_lower = damage_text.lower()
    component_keywords = {
        "screen": ["screen", "display", "lcd", "panel", "cracked", "broken display"],
        "battery": ["battery", "not charging", "dies quickly", "power"],
        "keyboard": ["keyboard", "key", "keys"],
        "motherboard": ["motherboard", "mainboard", "logic board"],
        "hard drive": ["hard drive", "hdd", "storage", "disk"],
        "ram": ["ram", "memory", "ram stick"],
        "charging port": ["charging port", "usb port", "usb-c", "port"],
        "speaker": ["speaker", "sound", "audio"],
        "camera": ["camera", "lens", "photo", "picture"],
        "hinge": ["hinge", "fold", "flexible"],
    }
    
    for component, keywords in component_keywords.items():
        if any(keyword in text_lower for keyword in keywords):
            damaged_components.add(component)
    
    # If crack detected, assume screen damage
    if crack_analysis and crack_analysis.get("classification") == "cracked":
        damaged_components.add("screen")
    
    # If corrosion detected
    if corrosion_analysis and corrosion_analysis.get("corrosion_level"):
        damaged_components.add("internal components")
    
    # If image detected specific component
    if image_analysis and image_analysis.get("predicted_component"):
        component = image_analysis.get("predicted_component").lower()
        if "screen" in component or "lcd" in component:
            damaged_components.add("screen")
        elif "battery" in component:
            damaged_components.add("battery")
        elif "keyboard" in component:
            damaged_components.add("keyboard")
        elif "hinge" in component:
            damaged_components.add("hinge")
        else:
            damaged_components.add(component)
    
    return list(damaged_components) if damaged_components else ["screen"]  # Default to screen if unclear


async def get_component_marketplace_prices(device_brand: str, device_model: str, components: list) -> list:
    """
    Get marketplace prices for specific damaged components
    
    Args:
        device_brand: Device brand (Samsung, Apple, etc.)
        device_model: Device model (Galaxy A54, iPhone 13, etc.)
        components: List of damaged components to search for
    
    Returns:
        List of marketplace results with URLs organized by component
    """
    all_prices = []
    
    for component in components:
        try:
            # Fetch marketplace prices for this specific component
            # Now passing the component parameter to get_market_prices()
            prices = await get_market_prices(device_brand, device_model, component=component)
            
            # Filter and label results for this component
            for price_item in prices:
                # Add component info to distinguish results
                price_item["component"] = component
                all_prices.append(price_item)
        except Exception as e:
            print(f"Error fetching prices for {component}: {e}")
            continue
    
    return all_prices


class ImageClassifier(nn.Module):
    """Simple CNN for laptop component image classification"""
    def __init__(self, num_classes=10):
        super(ImageClassifier, self).__init__()
        # Use pretrained ResNet18
        self.backbone = models.resnet18(pretrained=True)
        self.backbone.fc = nn.Linear(512, num_classes)
        self.num_classes = num_classes
    
    def forward(self, x):
        return self.backbone(x)


class CrackDetector(nn.Module):
    """ResNet18-based binary classifier for crack detection"""
    def __init__(self, num_classes=2):
        super(CrackDetector, self).__init__()
        self.backbone = models.resnet18(pretrained=True)
        self.backbone.fc = nn.Linear(512, num_classes)
        self.num_classes = num_classes
    
    def forward(self, x):
        return self.backbone(x)


class CorrosionDetector(nn.Module):
    """ResNet18-based multi-class classifier for corrosion levels"""
    def __init__(self, num_classes=5):
        super(CorrosionDetector, self).__init__()
        self.backbone = models.resnet18(pretrained=True)
        self.backbone.fc = nn.Linear(512, num_classes)
        self.num_classes = num_classes
    
    def forward(self, x):
        return self.backbone(x)


def load_issue_model():
    """Load NLP issue classifier"""
    try:
        model = joblib.load(MODEL_PATH / "issue_classifier_voting.joblib")
        return model
    except Exception as e:
        print(f"Error loading issue classifier: {e}")
        return None


def load_image_model():
    """Load image classification model (laptop components)"""
    try:
        model_path = MODEL_PATH / "image_classifier_laptop.pth"
        if model_path.exists():
            model = ImageClassifier(num_classes=len(LAPTOP_COMPONENTS))
            model.load_state_dict(torch.load(model_path, map_location='cpu'))
            model.eval()
            return model
        else:
            print(f"Image model not found at {model_path}")
            return None
    except Exception as e:
        print(f"Error loading image classifier: {e}")
        return None


def load_repairability_model():
    """Load repairability regressor"""
    try:
        model = joblib.load(MODEL_PATH / "repairability_voting_regressor.joblib")
        return model
    except Exception as e:
        print(f"Error loading repairability model: {e}")
        return None


def load_crack_model():
    """Load crack detection model (binary classifier)"""
    try:
        model_path = MODEL_PATH / "crack_detector.pth"
        if model_path.exists():
            model = CrackDetector(num_classes=2)
            model.load_state_dict(torch.load(model_path, map_location='cpu'))
            model.eval()
            return model
        else:
            print(f"Crack model not found at {model_path}")
            return None
    except Exception as e:
        print(f"Error loading crack detector: {e}")
        return None


def load_corrosion_model():
    """Load corrosion detection model (multi-class classifier)"""
    try:
        model_path = MODEL_PATH / "corrosion_detector.pth"
        if model_path.exists():
            model = CorrosionDetector(num_classes=5)
            model.load_state_dict(torch.load(model_path, map_location='cpu'))
            model.eval()
            return model
        else:
            print(f"Corrosion model not found at {model_path}")
            return None
    except Exception as e:
        print(f"Error loading corrosion detector: {e}")
        return None


def preprocess_image(image_path: str, image_size: Tuple[int, int] = (224, 224)) -> Optional[torch.Tensor]:
    """Preprocess image for model input"""
    try:
        img = Image.open(image_path).convert('RGB')
        transform = transforms.Compose([
            transforms.Resize(image_size),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
        return transform(img).unsqueeze(0)
    except Exception as e:
        print(f"Error preprocessing image: {e}")
        return None


def predict_issue_from_text(text_input: str, classifier) -> Dict:
    """Predict damage type from text description using the pipeline directly"""
    try:
        test_input = pd.DataFrame({
            "text_clean": [text_input.lower()],
            "source": ["user_input"]
        })

        prediction = classifier.predict(test_input)[0]

        try:
            scores = classifier.decision_function(test_input)
            confidence = float(1.0 / (1.0 + abs(scores[0])))
        except AttributeError:
            confidence = 0.85

        return {
            "source": "text",
            "predicted_label": str(prediction),
            "confidence": round(confidence, 4)
        }
    except Exception as e:
        return {
            "source": "text",
            "predicted_label": "Unknown damage",
            "confidence": 0.0,
            "error": str(e)
        }


def predict_issue_from_image(image_path: str, image_model) -> Dict:
    """Predict laptop component from image"""
    try:
        if not image_model:
            return {
                "source": "image",
                "predicted_component": "Unknown",
                "confidence": 0.0
            }
        
        # Preprocess image
        img_tensor = preprocess_image(image_path)
        if img_tensor is None:
            return {
                "source": "image",
                "predicted_component": "Unknown",
                "confidence": 0.0
            }
        
        # Predict
        with torch.no_grad():
            output = image_model(img_tensor)
            probabilities = torch.softmax(output, dim=1)
            confidence, predicted_idx = torch.max(probabilities, 1)
        
        component = LAPTOP_COMPONENTS[predicted_idx.item()]
        
        return {
            "source": "image",
            "predicted_component": component,
            "confidence": float(confidence.item())
        }
    except Exception as e:
        return {
            "source": "image",
            "predicted_component": "Unknown",
            "confidence": 0.0,
            "error": str(e)
        }


def predict_cracks(image_path: str, crack_model) -> Dict:
    """
    Detect if screen/component has cracks (binary classification)
    
    Returns:
    - classification: "cracked" or "not_cracked"
    - confidence: 0.0-1.0
    """
    try:
        if not crack_model:
            return {
                "source": "crack_detector",
                "classification": "unknown",
                "confidence": 0.0
            }
        
        # Preprocess image
        img_tensor = preprocess_image(image_path)
        if img_tensor is None:
            return {
                "source": "crack_detector",
                "classification": "unknown",
                "confidence": 0.0
            }
        
        # Predict
        with torch.no_grad():
            output = crack_model(img_tensor)
            probabilities = torch.softmax(output, dim=1)
            confidence, predicted_idx = torch.max(probabilities, 1)
        
        classes = ["not_cracked", "cracked"]
        classification = classes[predicted_idx.item()]
        
        return {
            "source": "crack_detector",
            "classification": classification,
            "confidence": float(confidence.item())
        }
    except Exception as e:
        return {
            "source": "crack_detector",
            "classification": "unknown",
            "confidence": 0.0,
            "error": str(e)
        }


def predict_corrosion(image_path: str, corrosion_model) -> Dict:
    """
    Detect corrosion level (multi-class: levels 5-9)
    
    5 = Low corrosion
    6 = Moderate corrosion
    7 = Significant corrosion
    8 = High corrosion
    9 = Severe corrosion
    
    Returns:
    - corrosion_level: 5-9
    - confidence: 0.0-1.0
    """
    try:
        if not corrosion_model:
            return {
                "source": "corrosion_detector",
                "corrosion_level": None,
                "confidence": 0.0
            }
        
        # Preprocess image
        img_tensor = preprocess_image(image_path)
        if img_tensor is None:
            return {
                "source": "corrosion_detector",
                "corrosion_level": None,
                "confidence": 0.0
            }
        
        # Predict
        with torch.no_grad():
            output = corrosion_model(img_tensor)
            probabilities = torch.softmax(output, dim=1)
            confidence, predicted_idx = torch.max(probabilities, 1)
        
        # Map to corrosion levels 5-9
        levels = [5, 6, 7, 8, 9]
        corrosion_level = levels[predicted_idx.item()]
        
        return {
            "source": "corrosion_detector",
            "corrosion_level": corrosion_level,
            "confidence": float(confidence.item())
        }
    except Exception as e:
        return {
            "source": "corrosion_detector",
            "corrosion_level": None,
            "confidence": 0.0,
            "error": str(e)
        }


async def combined_assessment_unified(
    damage_text: str,
    image_path: Optional[str] = None,
    device_brand: str = "",
    device_model: str = "",
    device_age_years: float = 0.0,
    device_type: str = "",
    price_php: float = 0.0,
    fetch_marketplace: bool = True,
    # ponytail: optional pre-loaded models to avoid per-request disk reads
    models: Optional[Dict] = None,
) -> Dict:
    """
    UNIFIED ASSESSMENT PIPELINE
    
    Combines:
    1. NLP classifier (text → damage type)
    2. Image classifier (image → component)
    3. Repairability scorer (combined → score)
    
    Args:
        damage_text: User description of damage
        image_path: Path to damage image (optional)
        device_brand: Device brand (Samsung, Apple, Dell, etc.)
        device_model: Device model
        device_age_years: Age of device in YEARS
        device_type: Device type (Smartphone, Laptop, Tablet)
        price_php: Original device price in PHP
        fetch_marketplace: Whether to fetch marketplace prices
        models: Pre-loaded model dict (optional). Keys: issue_classifier,
                image_classifier, crack_model, corrosion_model, repairability_model.
                If None, models are loaded from disk per-request.
    
    Returns:
        Complete assessment with:
        - damage_type (from text or image)
        - repairability_index (0-100)
        - estimated_price_php (including 600 peso labor fee)
        - is_repairable (bool)
        - reason (explanation)
    """
    
    # Use pre-loaded models or fall back to loading from disk
    if models is None:
        models = {}
    issue_classifier = models.get("issue_classifier") or load_issue_model()
    image_classifier = models.get("image_classifier") or load_image_model()
    crack_model = models.get("crack_model") or load_crack_model()
    corrosion_model = models.get("corrosion_model") or load_corrosion_model()
    repairability_model = models.get("repairability_model") or load_repairability_model()
    
    assessment = {
        "device_info": {
            "brand": device_brand,
            "model": device_model,
            "age_years": device_age_years,
            "type": device_type,
            "original_price_php": price_php
        },
        "damage_analysis": {},
        "repairability": {},
        "pricing": {},
        "marketplace_prices": [],
        "final_recommendation": {}
    }
    
    # ============ STEP 1: Analyze Text Description ============
    text_analysis = None
    if damage_text and issue_classifier:
        text_analysis = predict_issue_from_text(damage_text, issue_classifier)
        assessment["damage_analysis"]["text"] = text_analysis
    elif damage_text:
        assessment["damage_analysis"]["text"] = {
            "source": "text",
            "predicted_label": "Unknown (model unavailable)",
            "confidence": 0.0
        }
    
    # ============ STEP 2: Analyze Image (if provided) ============
    image_analysis = None
    crack_analysis = None
    corrosion_analysis = None
    
    if image_path and image_classifier:
        image_analysis = predict_issue_from_image(image_path, image_classifier)
        assessment["damage_analysis"]["image"] = image_analysis
        
        # Also detect cracks if crack model is available
        if crack_model:
            crack_analysis = predict_cracks(image_path, crack_model)
            assessment["damage_analysis"]["cracks"] = crack_analysis
        
        # Also detect corrosion if corrosion model is available
        if corrosion_model:
            corrosion_analysis = predict_corrosion(image_path, corrosion_model)
            assessment["damage_analysis"]["corrosion"] = corrosion_analysis
    
    # ============ STEP 3: Combine Damage Analysis ============
    # Use both text and image analysis to determine damage type
    # Include crack and corrosion information if available
    damage_type_parts = []
    
    if text_analysis:
        damage_type_parts.append(text_analysis.get('predicted_label', 'Unknown'))
    
    if image_analysis:
        damage_type_parts.append(image_analysis.get('predicted_component', 'Unknown'))
    
    # Add specific damage types if detected
    if crack_analysis and crack_analysis.get('classification') == 'cracked':
        damage_type_parts.append('Cracked')
    
    if corrosion_analysis and corrosion_analysis.get('corrosion_level'):
        level = corrosion_analysis.get('corrosion_level')
        damage_type_parts.append(f'Corrosion Level {level}')
    
    if text_analysis and image_analysis:
        # Combine confidence scores
        combined_confidence = (
            text_analysis.get("confidence", 0) + 
            image_analysis.get("confidence", 0)
        ) / 2
        damage_type = " - ".join(damage_type_parts) if damage_type_parts else "Unknown"
        assessment["damage_analysis"]["combined"] = {
            "damage_type": damage_type,
            "combined_confidence": combined_confidence
        }
    elif text_analysis:
        assessment["damage_analysis"]["combined"] = {
            "damage_type": " - ".join(damage_type_parts) if damage_type_parts else "Unknown",
            "combined_confidence": text_analysis.get("confidence", 0)
        }
    elif image_analysis:
        assessment["damage_analysis"]["combined"] = {
            "damage_type": " - ".join(damage_type_parts) if damage_type_parts else "Unknown",
            "combined_confidence": image_analysis.get("confidence", 0)
        }
    else:
        assessment["damage_analysis"]["combined"] = {
            "damage_type": " - ".join(damage_type_parts) if damage_type_parts else "Unable to determine damage",
            "combined_confidence": 0.0
        }
    
    # ============ STEP 4: Repairability Scoring ============
    # CRITICAL: Check device age first
    is_old = device_age_years >= NO_STOCK_AGE_THRESHOLD
    
    if is_old:
        # Old device logic: assume no stock available
        repairability_index = 20  # Very low
        is_repairable = False
        reason = f"Device is {device_age_years:.0f} years old. Replacement parts likely not in stock."
        recommendation = "Not repairable - Too old, no replacement parts available"
    elif repairability_model:
        device_desc = f"{device_brand} {device_model} {device_type}".strip()
        try:
            repair_input = pd.DataFrame({
                "device_text_clean": [device_desc.lower()],
                "source": ["user_input"],
                "repair_cost": [0],
                "customer_rating": [0],
                "usage_duration": [device_age_years * 12],
            })
            score = repairability_model.predict(repair_input)[0]
            
            # Convert to 0-100 index
            repairability_index = float(score) * 10  # 1-10 → 10-100
            is_repairable = repairability_index > 50  # Fix 3: raised from 30 — index of 31 is barely repairable
            
            if repairability_index >= 70:
                reason = "Easy to repair - Parts available, low cost"
                recommendation = "✅ REPAIR RECOMMENDED"
            elif repairability_index >= 40:
                reason = "Moderately repairable - Some difficulty"
                recommendation = "⚠️ CONSIDER REPAIR (may be expensive)"
            else:
                reason = "Difficult to repair - Parts scarce or costly"
                recommendation = "❌ NOT RECOMMENDED - Consider replacement"
        except Exception as e:
            repairability_index = 40  # Fix 5: conservative default on error
            is_repairable = False     # Fix 5: errors must not silently vote REPAIR
            reason = f"Unable to calculate repairability score: {str(e)}"
            recommendation = "⚠️ Manual assessment required — defaulting to recycle"
    else:
        repairability_index = 40  # Fix 5: conservative when model absent
        is_repairable = False     # Fix 5: unknown = don't assume REPAIR
        reason = "Repairability model not available — cannot confirm repairability"
        recommendation = "⚠️ Manual assessment required — defaulting to recycle"
    
    assessment["repairability"] = {
        "repairability_index": float(repairability_index),
        "is_repairable": is_repairable,
        "reason": reason,
        "age_warning": is_old
    }
    
    # ============ STEP 5: Pricing Calculation ============
    # Fixed labor fee: 600 PHP
    labor_fee_php = LABOR_FEE_PHP
    
    # Identify damaged components for marketplace search
    damaged_components = identify_damaged_components(
        damage_text, 
        crack_analysis=crack_analysis,
        corrosion_analysis=corrosion_analysis,
        image_analysis=image_analysis
    )
    
    # Estimated parts cost (from marketplace or default)
    parts_cost_php = 0
    marketplace_prices = []
    
    if fetch_marketplace and MARKETPLACE_AVAILABLE and device_brand and device_model:
        try:
            # Fetch component-specific marketplace prices
            marketplace_prices = await get_component_marketplace_prices(device_brand, device_model, damaged_components)
            
            if marketplace_prices:
                prices = [p.get("price", 0) for p in marketplace_prices if p.get("price")]
                if prices:
                    parts_cost_php = sum(prices) / len(prices)
        except Exception as e:
            print(f"Error fetching marketplace prices: {e}")
            parts_cost_php = 0
    
    # Add component information to assessment for user reference
    assessment["damage_analysis"]["damaged_components"] = damaged_components
    assessment["damage_analysis"]["marketplace_for_repair"] = {
        "components": damaged_components,
        "note": f"Searching marketplace for {', '.join(damaged_components)} replacement parts, NOT the whole device"
    }
    
    # If old device, no parts available = higher cost or not available
    if is_old:
        parts_cost_php = price_php * 0.5  # Assume 50% of device value if parts can be found
        price_recommendation = "PARTS NOT IN STOCK - Not recommended"
    else:
        price_recommendation = f"Repair cost is reasonable" if (parts_cost_php + labor_fee_php) < (price_php * 0.7) else "Consider replacement"
    
    total_repair_cost_php = parts_cost_php + labor_fee_php
    repair_ratio = total_repair_cost_php / price_php if price_php > 0 else 0
    
    assessment["pricing"] = {
        "labor_fee_php": labor_fee_php,
        "estimated_parts_cost_php": round(parts_cost_php, 2),
        "total_repair_cost_php": round(total_repair_cost_php, 2),
        "original_device_price_php": price_php,
        "repair_ratio": round(repair_ratio, 3),
        "price_recommendation": price_recommendation,
        "damaged_components": damaged_components
    }
    
    # Format marketplace results with URLs for user
    marketplace_results = []
    if marketplace_prices:
        for item in marketplace_prices:
            marketplace_results.append({
                "component": item.get("component", "part"),
                "source": item.get("source"),
                "title": item.get("title"),
                "price_php": item.get("price"),
                "url": item.get("url"),
                "currency": "PHP"
            })
    
    assessment["marketplace_prices"] = marketplace_results
    
    # ============ STEP 6: Final Recommendation ============
    if not is_repairable or is_old:
        final_decision = "❌ NOT REPAIRABLE"
        explanation = reason if is_old else "Device is not recommended for repair"
    elif repair_ratio > 0.7:
        final_decision = "⚠️ CONSIDER REPLACEMENT"
        explanation = f"Repair cost (₱{total_repair_cost_php:.0f}) exceeds 70% of device value (₱{price_php:.0f})"
    elif repair_ratio > 0.5:
        final_decision = "⚠️ MARGINAL REPAIR"
        explanation = f"Repair cost (₱{total_repair_cost_php:.0f}) is 50-70% of device value"
    else:
        final_decision = "✅ REPAIR RECOMMENDED"
        explanation = f"Repair cost (₱{total_repair_cost_php:.0f}) is reasonable (<50% of device value)"
    
    assessment["final_recommendation"] = {
        "decision": final_decision,
        "explanation": explanation,
        "estimated_total_cost_php": round(total_repair_cost_php, 2),
        "damage_type": assessment["damage_analysis"]["combined"]["damage_type"],
        "repairability_index": round(repairability_index, 1)
    }
    
    return assessment


# ============ LEGACY FUNCTIONS (for backward compatibility) ============

def predict_issue_type(text_input: str) -> Dict:
    """Legacy function - Predict damage type from text only"""
    classifier = load_issue_model()
    if not classifier:
        return {"predicted_label": "Unknown", "confidence": 0.0}
    return predict_issue_from_text(text_input, classifier)


def predict_repairability(device_text: str, **kwargs) -> Dict:
    """Legacy function - Predict repairability score"""
    model = load_repairability_model()
    if not model:
        return {
            "repairability_score": 5.0,
            "is_repairable": True,
            "recommendation": "Model not available"
        }
    
    try:
        repair_input = pd.DataFrame({
            "device_text_clean": [device_text.lower()],
            "source": [kwargs.get("device_source", "user_input")],
            "repair_cost": [kwargs.get("repair_cost", 0)],
            "customer_rating": [kwargs.get("customer_rating", 0)],
            "usage_duration": [kwargs.get("usage_duration", 0)],
        })
        score = model.predict(repair_input)[0]
        return {
            "repairability_score": float(score),
            "is_repairable": float(score) > 3.0,
            "recommendation": "Moderately repairable" if float(score) > 3 else "Difficult to repair"
        }
    except Exception as e:
        return {
            "repairability_score": 5.0,
            "is_repairable": True,
            "recommendation": f"Error: {str(e)}"
        }


if __name__ == "__main__":
    # Example usage
    result = asyncio.run(combined_assessment_unified(
        damage_text="My laptop screen is cracked and keyboard not working",
        image_path=None,  # Optional: path to damage image
        device_brand="Dell",
        device_model="XPS 13",
        device_age_years=3,
        device_type="Laptop",
        price_php=50000,
        fetch_marketplace=False
    ))
    
    import json
    print(json.dumps(result, indent=2, default=str))
