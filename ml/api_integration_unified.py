"""
Updated FastAPI Application - Unified ML Pipeline with Image Support
===================================================================

NEW ENDPOINTS:
- POST /assess/unified - Complete assessment (text + image + device info)
  • Text analysis (NLP damage classification)
  • Image analysis (laptop component detection)
  • Crack detection (binary: cracked/not_cracked)
  • Corrosion detection (5 levels: 5-9)
  • Repairability scoring
  • Marketplace pricing (dynamic)

- POST /assess/text-only - Text-only assessment (legacy)
- POST /health - Health check
- GET /info/models - Model information
"""

from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import json
import aiofiles
import os
from pathlib import Path

# Import unified prediction module
from ml.predict_unified import (
    combined_assessment_unified,
    load_issue_model,
    load_image_model,
    load_crack_model,
    load_corrosion_model,
    load_repairability_model,
)

# Initialize FastAPI
app = FastAPI(
    title="Device Repair Assessment API (Unified)",
    description="ML-powered device repair assessment with image classification",
    version="2.0"
)

# ============ PYDANTIC MODELS ============

class UnifiedAssessmentRequest(BaseModel):
    """Request for unified text + image assessment"""
    damage_text: str
    device_brand: str = ""
    device_model: str = ""
    device_age_years: float = 0.0
    device_type: str = ""
    price_php: float = 0.0
    fetch_marketplace: bool = True  # 🎯 MARKETPLACE ENABLED BY DEFAULT
    
    class Config:
        json_schema_extra = {
            "example": {
                "damage_text": "My laptop screen is cracked and keyboard not working",
                "device_brand": "Dell",
                "device_model": "XPS 13",
                "device_age_years": 3,
                "device_type": "Laptop",
                "price_php": 50000,
                "fetch_marketplace": True  # 🎯 Fetch real-time marketplace prices
            }
        }


class TextOnlyAssessmentRequest(BaseModel):
    """Request for text-only assessment (legacy)"""
    damage_text: str
    device_brand: Optional[str] = ""
    device_model: Optional[str] = ""
    device_age_years: Optional[float] = 0.0
    device_type: Optional[str] = ""
    price_php: Optional[float] = 0.0
    fetch_marketplace: Optional[bool] = True  # 🎯 MARKETPLACE ENABLED BY DEFAULT


class AssessmentResponse(BaseModel):
    """Response from assessment"""
    device_info: dict
    damage_analysis: dict
    repairability: dict
    pricing: dict
    marketplace_prices: list = []
    final_recommendation: dict


# ============ ENDPOINTS ============

@app.get("/health")
def health_check():
    """Health check endpoint — uses models loaded at startup"""
    models = {}
    all_healthy = True
    stored = getattr(app.state, "models", {})

    for key, label in [
        ("issue_classifier", "issue_classifier"),
        ("image_classifier", "image_classifier"),
        ("crack_model", "crack_detector"),
        ("corrosion_model", "corrosion_detector"),
        ("repairability_model", "repairability_scorer"),
    ]:
        status = "loaded" if stored.get(key) else "not found"
        models[label] = status
        if status != "loaded":
            all_healthy = False

    return {
        "status": "healthy" if all_healthy else "degraded",
        "models": models,
    }


@app.post("/assess/unified", response_model=AssessmentResponse)
async def assess_unified_with_file(
    damage_text: str = Form(...),
    device_brand: str = Form(""),
    device_model: str = Form(""),
    device_age_years: float = Form(0.0),
    device_type: str = Form(""),
    price_php: float = Form(0.0),
    fetch_marketplace: bool = Form(True),  # 🎯 ENABLED BY DEFAULT
    image: Optional[UploadFile] = File(None)
):
    """
    UNIFIED ASSESSMENT - Text + Image + Device Info + CRACK + CORROSION + MARKETPLACE PRICING
    
    Performs complete assessment combining:
    1. NLP classification (from damage text)
    2. Image classification (from damage photo - laptop components)
    3. Crack detection (from image - binary: cracked/not_cracked)
    4. Corrosion detection (from image - levels 5-9)
    5. Repairability scoring (from device info + age)
    6. Marketplace pricing (from Shopee + Lazada) ← DYNAMIC PRICING
    
    Returns:
    - Damage type (text + image + cracks + corrosion)
    - Crack detection result (if image provided)
    - Corrosion level (if image provided)
    - Repairability index (0-100)
    - Real-time marketplace prices (Shopee + Lazada)
    - Estimated repair cost (parts from marketplace + ₱600 labor fee)
    - Final recommendation (repair/replace) based on price ratio
    
    DAMAGE ANALYSIS FEATURES:
    ✅ NLP-based damage classification
    ✅ Laptop component identification
    ✅ Crack detection (100% accuracy on test set)
    ✅ Corrosion level classification (5 levels)
    ✅ Real-time marketplace pricing
    ✅ Smart repair recommendations
    
    Note: If device is 10+ years old, assumes no stock available
    """
    
    image_path = None
    try:
        # Save uploaded image if provided
        if image:
            upload_dir = Path("./temp_uploads")
            upload_dir.mkdir(exist_ok=True)
            image_path = upload_dir / image.filename
            
            async with aiofiles.open(image_path, 'wb') as f:
                content = await image.read()
                await f.write(content)
        
        # Run unified assessment with marketplace pricing
        result = await combined_assessment_unified(
            damage_text=damage_text,
            image_path=str(image_path) if image_path else None,
            device_brand=device_brand,
            device_model=device_model,
            device_age_years=device_age_years,
            device_type=device_type,
            price_php=price_php,
            fetch_marketplace=fetch_marketplace,
            models=getattr(app.state, "models", None),
        )
        
        return AssessmentResponse(**result)
    
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Unified assessment failed: {str(e)}"
        )
    
    finally:
        # Clean up uploaded file
        if image_path and image_path.exists():
            try:
                os.remove(image_path)
            except:
                pass


@app.post("/assess/text-only")
async def assess_text_only(request: TextOnlyAssessmentRequest):
    """
    TEXT-ONLY ASSESSMENT WITH MARKETPLACE PRICING
    
    Quick assessment from damage description + marketplace pricing.
    Does NOT require image (but image optional in unified endpoint).
    
    MARKETPLACE FEATURES:
    ✅ Real-time prices from Shopee Philippines
    ✅ Real-time prices from Lazada Philippines
    ✅ Average price used for parts cost
    ✅ Total cost = marketplace average + ₱600 labor fee
    ✅ Smart repair recommendation based on cost ratio
    
    Good for: Quick text-based assessments with accurate pricing
    """
    
    try:
        result = await combined_assessment_unified(
            damage_text=request.damage_text,
            image_path=None,
            device_brand=request.device_brand,
            device_model=request.device_model,
            device_age_years=request.device_age_years,
            device_type=request.device_type,
            price_php=request.price_php,
            fetch_marketplace=request.fetch_marketplace if request.fetch_marketplace is not None else True,
            models=getattr(app.state, "models", None),
        )
        
        return AssessmentResponse(**result)
    
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Assessment failed: {str(e)}"
        )


@app.get("/info/models")
def get_model_info():
    """Get model metadata and performance metrics"""
    
    try:
        # Try to load training summary
        summary_path = Path(__file__).parent / "models" / "training_summary.json"
        summary = {}
        
        if summary_path.exists():
            with open(summary_path, 'r') as f:
                summary = json.load(f)
        
        return {
            "models": {
                "issue_classifier": {
                    "name": "issue_classifier_voting.joblib",
                    "type": "Voting Classifier (NLP)",
                    "algorithms": ["LinearSVC", "RandomForest", "LogisticRegression"],
                    "accuracy": summary.get("issue_classifier_accuracy", 0.988),
                    "training_samples": 4000
                },
                "image_classifier": {
                    "name": "image_classifier_laptop.pth",
                    "type": "ResNet18 (CNN)",
                    "classes": 10,  # Laptop components
                    "training_samples": "variable"
                },
                "repairability_scorer": {
                    "name": "repairability_voting_regressor.joblib",
                    "type": "Voting Regressor",
                    "algorithms": ["DecisionTree", "RandomForest"],
                    "r2_score": summary.get("repairability_r2", 0.8763),
                    "mae": summary.get("repairability_mae", 0.2122),
                    "training_samples": 6548
                }
            },
            "business_logic": {
                "labor_fee_php": 600,
                "no_stock_threshold_years": 10,
                "repair_cost_thresholds": {
                    "recommended": "<50% of device value",
                    "marginal": "50-70% of device value",
                    "not_recommended": ">70% of device value"
                }
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model info: {str(e)}")


@app.get("/info/output-format")
def get_output_format():
    """Get documentation on output format"""
    
    return {
        "description": "Unified Assessment Output Format",
        "structure": {
            "device_info": {
                "brand": "str - Device brand",
                "model": "str - Device model",
                "age_years": "float - Age in years",
                "type": "str - Device type (Laptop, Smartphone, Tablet)",
                "original_price_php": "float - Original device price in PHP"
            },
            "damage_analysis": {
                "text": {
                    "source": "text",
                    "predicted_label": "Damage type from NLP",
                    "confidence": "0-1 confidence score"
                },
                "image": {
                    "source": "image",
                    "predicted_component": "Component from image classification",
                    "confidence": "0-1 confidence score"
                },
                "combined": {
                    "damage_type": "Combined damage type from text + image",
                    "combined_confidence": "Average of both models"
                }
            },
            "repairability": {
                "repairability_index": "0-100 score",
                "is_repairable": "bool",
                "reason": "Explanation of score",
                "age_warning": "bool - True if 10+ years old"
            },
            "pricing": {
                "labor_fee_php": "Fixed at ₱600",
                "estimated_parts_cost_php": "From marketplace or estimate",
                "total_repair_cost_php": "Parts + Labor",
                "original_device_price_php": "User-provided price",
                "repair_ratio": "Total cost / Device price",
                "price_recommendation": "Whether repair is economical"
            },
            "marketplace_prices": [
                {
                    "source": "Shopee/Lazada",
                    "title": "Product title",
                    "price": "Price in PHP",
                    "url": "Product link"
                }
            ],
            "final_recommendation": {
                "decision": "✅ REPAIR / ⚠️ MARGINAL / ❌ NOT REPAIRABLE",
                "explanation": "Detailed reasoning",
                "estimated_total_cost_php": "Total cost to user",
                "damage_type": "What's wrong",
                "repairability_index": "Overall score"
            }
        }
    }


# ============ STARTUP & SHUTDOWN ============

@app.on_event("startup")
async def startup_event():
    """Load models once at startup and store in app.state"""
    print("Loading ML models...")
    app.state.models = {}
    for key, name, loader in [
        ("issue_classifier", "Issue Classifier", load_issue_model),
        ("image_classifier", "Image Classifier", load_image_model),
        ("crack_model", "Crack Detector", load_crack_model),
        ("corrosion_model", "Corrosion Detector", load_corrosion_model),
        ("repairability_model", "Repairability Scorer", load_repairability_model),
    ]:
        try:
            model = loader()
            app.state.models[key] = model
            print(f"  ✓ {name}: {'Loaded' if model else 'Not found'}")
        except Exception as e:
            app.state.models[key] = None
            print(f"  ✗ {name}: Error - {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("Shutting down API...")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
