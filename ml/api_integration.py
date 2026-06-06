"""
FastAPI Integration for ML Models
Provides REST endpoints for damage assessment and repairability scoring
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import json

from predict import (
    predict_issue_type,
    predict_repairability,
    combined_assessment,
)


app = FastAPI(
    title="Device Damage & Repairability Assessment API",
    description="ML-powered API for assessing device damage type and repairability",
    version="1.0.0",
)


# ============================================================================
# Pydantic Models for Request/Response
# ============================================================================


class IssueCheckRequest(BaseModel):
    """Request for damage/issue classification"""
    text: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "I drop my phone a week ago then suddenly its slowing and also it has crack"
            }
        }


class IssueCheckResponse(BaseModel):
    """Response from issue classifier"""
    input: str
    predicted_label: str
    confidence: float
    
    class Config:
        json_schema_extra = {
            "example": {
                "input": "I drop my phone...",
                "predicted_label": "Cracked screen",
                "confidence": 0.97
            }
        }


class RepairabilityRequest(BaseModel):
    """Request for repairability scoring"""
    device_text: str
    device_source: Optional[str] = "user_input"
    repair_cost: Optional[float] = 0.0
    customer_rating: Optional[float] = 0.0
    usage_duration: Optional[float] = 0.0
    price: Optional[float] = 0.0
    battery_capacity: Optional[float] = 0.0
    weight: Optional[float] = 0.0
    
    class Config:
        json_schema_extra = {
            "example": {
                "device_text": "Samsung Galaxy A54 Smartphone",
                "repair_cost": 150.0,
                "price": 349.0,
                "usage_duration": 12.0
            }
        }


class RepairabilityResponse(BaseModel):
    """Response from repairability scorer"""
    device_text: str
    repairability_score: float
    is_repairable: bool
    recommendation: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "device_text": "Samsung Galaxy A54 Smartphone",
                "repairability_score": 7.5,
                "is_repairable": True,
                "recommendation": "Moderately repairable - some parts may be hard to find"
            }
        }


class CombinedAssessmentRequest(BaseModel):
    """Request for combined damage + repairability assessment"""
    damage_text: str
    device_brand: Optional[str] = ""
    device_model: Optional[str] = ""
    device_age_months: Optional[float] = 0.0
    device_type: Optional[str] = ""
    repair_cost: Optional[float] = 0.0
    price: Optional[float] = 0.0
    fetch_marketplace: Optional[bool] = True
    
    class Config:
        json_schema_extra = {
            "example": {
                "damage_text": "My phone has a crack and battery doesn't hold charge",
                "device_brand": "Samsung",
                "device_model": "Galaxy A54",
                "device_age_months": 12,
                "device_type": "Smartphone",
                "repair_cost": 150.0,
                "price": 349.0,
                "fetch_marketplace": True
            }
        }


class CombinedAssessmentResponse(BaseModel):
    """Response from combined assessment with marketplace data"""
    damage_assessment: dict
    repairability_assessment: dict
    marketplace_prices: list = []
    cost_analysis: dict
    overall_recommendation: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "damage_assessment": {
                    "predicted_label": "Cracked screen",
                    "confidence": 0.95
                },
                "repairability_assessment": {
                    "repairability_score": 7.5,
                    "is_repairable": True,
                    "recommendation": "Moderately repairable..."
                },
                "marketplace_prices": [
                    {
                        "source": "Shopee",
                        "title": "Samsung Galaxy S21 screen replacement",
                        "price": 2500.00,
                        "currency": "PHP",
                        "url": "https://shopee.ph/..."
                    }
                ],
                "cost_analysis": {
                    "estimated_repair_cost": 2650.00,
                    "estimated_parts_cost": 2500.00,
                    "labor_cost": 150.00,
                    "device_value": 25000.00,
                    "repair_ratio": 0.106,
                    "recommendation": "Repair cost is reasonable (<50% of device value). Repair recommended."
                },
                "overall_recommendation": "Device has Cracked screen and is repairable. Moderately repairable..."
            }
        }


# ============================================================================
# Health Check
# ============================================================================


@app.get("/health")
def health_check():
    """Health check endpoint to verify API and models are loaded"""
    try:
        # Quick test to ensure models load
        test_text = "test"
        predict_issue_type(test_text)
        return {
            "status": "healthy",
            "models": [
                "issue_classifier_voting.joblib",
                "repairability_voting_regressor.joblib"
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Model loading failed: {str(e)}")


# ============================================================================
# Damage/Issue Classification Endpoint
# ============================================================================


@app.post("/assess/issue", response_model=IssueCheckResponse)
def assess_issue(request: IssueCheckRequest):
    """
    Classify device damage/issue type from user text input.
    
    **Example:**
    ```
    POST /assess/issue
    {
        "text": "I drop my phone a week ago then suddenly its slowing and also it has crack"
    }
    ```
    
    **Response:**
    ```
    {
        "input": "I drop my phone...",
        "predicted_label": "Cracked screen",
        "confidence": 0.97
    }
    ```
    """
    try:
        result = predict_issue_type(request.text)
        return IssueCheckResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Issue classification failed: {str(e)}")


# ============================================================================
# Repairability Scoring Endpoint
# ============================================================================


@app.post("/assess/repairability", response_model=RepairabilityResponse)
def assess_repairability(request: RepairabilityRequest):
    """
    Score device repairability on 1-10 scale.
    
    **Example:**
    ```
    POST /assess/repairability
    {
        "device_text": "Samsung Galaxy A54 Smartphone",
        "repair_cost": 150.0,
        "price": 349.0,
        "usage_duration": 12.0
    }
    ```
    
    **Response:**
    ```
    {
        "device_text": "Samsung Galaxy A54 Smartphone",
        "repairability_score": 7.5,
        "is_repairable": true,
        "recommendation": "Moderately repairable - some parts may be hard to find"
    }
    ```
    """
    try:
        result = predict_repairability(
            device_text=request.device_text,
            device_source=request.device_source,
            repair_cost=request.repair_cost,
            customer_rating=request.customer_rating,
            usage_duration=request.usage_duration,
            price=request.price,
            battery_capacity=request.battery_capacity,
            weight=request.weight,
        )
        return RepairabilityResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Repairability assessment failed: {str(e)}")


# ============================================================================
# Combined Assessment Endpoint
# ============================================================================


@app.post("/assess/combined", response_model=CombinedAssessmentResponse)
def assess_combined(request: CombinedAssessmentRequest):
    """
    Combined assessment: identify damage type AND score repairability in one call.
    Includes real-time marketplace prices for replacement parts.
    
    **Example:**
    ```
    POST /assess/combined
    {
        "damage_text": "My phone has a crack and battery doesn't hold charge",
        "device_brand": "Samsung",
        "device_model": "Galaxy A54",
        "device_age_months": 12,
        "device_type": "Smartphone",
        "repair_cost": 150.0,
        "price": 349.0,
        "fetch_marketplace": true
    }
    ```
    
    **Response includes:**
    - Damage assessment (type + confidence)
    - Repairability score (1-10)
    - Marketplace prices from Shopee/Lazada
    - Cost analysis (total cost, repair ratio, recommendation)
    - Overall recommendation
    """
    try:
        result = combined_assessment(
            damage_text=request.damage_text,
            device_brand=request.device_brand,
            device_model=request.device_model,
            device_age_months=request.device_age_months,
            device_type=request.device_type,
            repair_cost=request.repair_cost,
            price=request.price,
            fetch_marketplace=request.fetch_marketplace,
        )
        return CombinedAssessmentResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Combined assessment failed: {str(e)}")


# ============================================================================
# Information Endpoints
# ============================================================================


@app.get("/info/models")
def get_model_info():
    """Get information about trained models and their performance"""
    from pathlib import Path
    import json
    
    summary_file = Path(__file__).parent / "models" / "training_summary.json"
    if summary_file.exists():
        with open(summary_file) as f:
            return json.load(f)
    return {
        "error": "Training summary not found. Run train_text_models.py first."
    }


@app.get("/info/schemas")
def get_schemas():
    """Get request/response schema information"""
    return {
        "issue_check": {
            "request": IssueCheckRequest.model_json_schema(),
            "response": IssueCheckResponse.model_json_schema()
        },
        "repairability": {
            "request": RepairabilityRequest.model_json_schema(),
            "response": RepairabilityResponse.model_json_schema()
        },
        "combined": {
            "request": CombinedAssessmentRequest.model_json_schema(),
            "response": CombinedAssessmentResponse.model_json_schema()
        }
    }


# ============================================================================
# Startup
# ============================================================================


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
