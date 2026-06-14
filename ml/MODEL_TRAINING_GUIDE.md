# ML Model Training & Inference Pipeline

## Overview

This folder contains a complete ML pipeline for device damage assessment and repairability scoring:

1. **Issue Classifier** (`issue_classifier_voting.joblib`) - Identifies damage type from user text input using NLP
2. **Repairability Regressor** (`repairability_voting_regressor.joblib`) - Scores device repairability on 1-10 scale using ensemble methods
3. **Processed Datasets** - Cleaned and standardized training data in `datasets/Data_processing/`

## Model Architecture

### 1. Issue/Damage Classifier (NLP-based)
**Purpose**: Identify what damage/issue the device has from user text description

**Input**: 
- User text (e.g., "I drop my phone a week ago then suddenly its slowing and also it has crack")

**Output**:
- Predicted issue label (e.g., "Cracked screen", "Battery issue", "Hardware issue")
- Confidence score (0-1)

**Training Data**: 
- `device_issue_dataset_2000.csv` (2000 samples)
- `final_dataset.csv` (2000 samples with predictions)

**Model Details**:
- **Algorithm**: Voting Classifier (ensemble of 3 models)
  - LinearSVC (Support Vector Classification)
  - RandomForest (100 trees)
  - LogisticRegression
- **Feature Engineering**: TF-IDF vectorization (bigrams, max 200 features)
- **Accuracy**: **97.25%** on validation set
- **Training Samples**: 4000 unique issue descriptions

### 2. Repairability Scoring Regressor  
**Purpose**: Score how repairable a device is based on device specs, repair costs, and historical data

**Input**:
- Device text description (brand, model, type)
- Device source category
- Repair cost (optional)
- Customer rating (optional)
- Usage duration/age (optional)

**Output**:
- Repairability score: 1-10 scale
  - **8-10**: Highly repairable (parts readily available, low cost)
  - **6-8**: Moderately repairable (some parts may be hard to find)
  - **4-6**: Difficult to repair (parts scarce or costly)
  - **1-4**: Not recommended for repair
- Recommendation text
- Binary repairable flag (score >= 5.0)

**Training Data**:
- `repairability-final.csv` (865 samples) - Vision/repairability scores
- `iFixit Repairability Scores (Public) - Smartphones.csv` (155 samples) - Professional repairs
- `Repair-History.csv` (528 samples) - Repair outcomes
- `tech_gadget_failures.csv` (10000 samples, sampled 3000) - Failure patterns and repair costs
- `laptop_dataset_final.csv` (8198 samples, sampled 2000) - Device specifications and pricing

**Model Details**:
- **Algorithm**: Voting Regressor (ensemble of 2 models)
  - DecisionTree (max_depth=6)
  - RandomForest (100 trees, max_depth=6)
- **Feature Engineering**:
  - Text: TF-IDF vectorization (bigrams, max 200 features)
  - Numeric: repair_cost, customer_rating, usage_duration (pass-through)
  - Categorical: source (one-hot encoded)
- **Performance**:
  - **R² Score**: 0.5303 (explains ~53% of variance)
  - **Mean Absolute Error (MAE)**: 0.8123 on 1-10 scale (±0.81 points)
- **Training Samples**: 6548 device records

## File Structure

```
ml/
├── models/
│   ├── issue_classifier_voting.joblib          # Issue/damage classifier
│   ├── repairability_voting_regressor.joblib   # Repairability scorer
│   ├── training_summary.json                   # Training metrics
│   └── mobilenetv3_small_binary.pth            # (Image classifier - separate)
│
├── datasets/
│   ├── device_issue_dataset_2000.csv           # Issue training data
│   ├── final_dataset.csv                       # Predicted labels
│   ├── repairability-final.csv                 # Repairability scores
│   ├── iFixit Repairability Scores...csv       # Professional assessments
│   ├── Repair-History.csv                      # Repair outcomes
│   ├── tech_gadget_failures.csv                # Device failures
│   ├── laptop_dataset_final.csv                # Laptop specs
│   └── Data_processing/
│       ├── processed_issue_dataset.csv         # Cleaned issue data
│       └── processed_repairability_dataset.csv # Cleaned repairability data
│
├── train_text_models.py                        # Training pipeline
├── predict.py                                  # Inference module
├── example_usage.py                            # Usage examples
└── app.py                                      # FastAPI service
```

## Usage

### Option 1: Command-line Prediction

```python
from predict import combined_assessment

result = combined_assessment(
    damage_text="I drop my phone a week ago then suddenly its slowing and also it has crack",
    device_brand="Samsung",
    device_model="Galaxy A54",
    device_age_months=12,
    device_type="Smartphone",
    repair_cost=150.0,
    price=349.0,
)

print(result)
# Output:
# {
#   "damage_assessment": {
#     "input": "...",
#     "predicted_label": "Cracked screen",
#     "confidence": 0.95
#   },
#   "repairability_assessment": {
#     "device_text": "Samsung Galaxy A54 Smartphone",
#     "repairability_score": 7.5,
#     "is_repairable": true,
#     "recommendation": "Moderately repairable..."
#   },
#   "overall_recommendation": "..."
# }
```

### Option 2: FastAPI Service

```bash
python app.py
```

Then POST to `/predict` endpoint with:
```json
{
  "damage_text": "...",
  "device_brand": "Samsung",
  "device_model": "Galaxy A54",
  "device_age_months": 12,
  "device_type": "Smartphone",
  "repair_cost": 150.0,
  "price": 349.0
}
```

### Option 3: Run Examples

```bash
python example_usage.py
```

This runs 4 example scenarios:
1. Damage classification for a single device
2. Repairability scoring
3. Combined assessment with recommendations
4. Multiple device comparisons

## Training New Models

To retrain the models (if new data is added):

```bash
python train_text_models.py
```

This will:
1. Load all CSV datasets from `datasets/`
2. Preprocess and clean the data
3. Train both classifiers
4. Save model artifacts to `models/`
5. Save processed data to `datasets/Data_processing/`
6. Generate `training_summary.json` with metrics

Training typically takes 2-3 minutes on standard hardware.

## Inference Function Reference

### `predict_issue_type(text_input: str) -> dict`
Predict damage/issue type from text.

**Parameters**:
- `text_input` (str): User description of device damage

**Returns**:
```python
{
    "input": str,
    "predicted_label": str,
    "confidence": float
}
```

### `predict_repairability(...) -> dict`
Score device repairability.

**Parameters**:
- `device_text` (str): Device description
- `device_source` (str): Source category (default: "user_input")
- `repair_cost` (float): Estimated repair cost
- `customer_rating` (float): Customer satisfaction (1-5)
- `usage_duration` (float): Usage in months
- `price` (float): Original device price
- `battery_capacity` (float): Battery capacity
- `weight` (float): Device weight

**Returns**:
```python
{
    "device_text": str,
    "repairability_score": float,  # 1-10
    "is_repairable": bool,
    "recommendation": str
}
```

### `combined_assessment(...) -> dict`
Single call for damage + repairability assessment.

**Parameters**:
- `damage_text` (str): Device damage description
- `device_brand` (str): Device brand
- `device_model` (str): Device model
- `device_age_months` (float): Device age in months
- `device_type` (str): Device type (Smartphone, Laptop, Tablet)
- `repair_cost` (float): Estimated repair cost
- `price` (float): Original device price

**Returns**:
```python
{
    "damage_assessment": {...},
    "repairability_assessment": {...},
    "overall_recommendation": str
}
```

## Integration with Frontend

### Flow:
1. **User Input**: User describes device damage in text + selects device brand/model
2. **Damage Classification**: `predict_issue_type()` → damage label + confidence
3. **Repairability Scoring**: `predict_repairability()` → score (1-10) + recommendation
4. **Display Result**: Show damage type, repairability score, and recommendation

### Example Frontend Call:
```javascript
const assessment = await fetch('/api/assess', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    damage_text: "My phone screen has a crack and battery drains fast",
    device_brand: "Samsung",
    device_model: "Galaxy S21",
    device_age_months: 24,
    device_type: "Smartphone",
    repair_cost: 120,
    price: 799
  })
});

const result = await assessment.json();
// {
//   damage: "Cracked screen",
//   repairability: 7.2,
//   recommendation: "Moderately repairable..."
// }
```

## Future Enhancements

1. **Image Classification**: Train separate model for device damage photos (crack detection, battery swelling, port damage)
2. **Fine-tuning**: Retrain with domain-specific device repair data
3. **Real-time Learning**: Update model with actual repair outcomes from users
4. **Multilingual Support**: Extend to support non-English damage descriptions
5. **Part Availability Integration**: Link repairability scores with actual part availability databases

## Performance Notes

- **Inference Speed**: ~100ms per prediction on CPU
- **Model Size**: ~50MB (both models combined)
- **Memory Usage**: ~500MB during inference
- **Accuracy**: 97.25% on damage classification, R²=0.53 on repairability

## Dependencies

See `requirements.txt` for full list. Key packages:
- `scikit-learn` - ML models
- `pandas` - Data processing
- `joblib` - Model serialization
- `fastapi` - REST API (optional)

## License & Attribution

- **iFixit Data**: Used under fair use for educational purposes (repairability assessments)
- **Custom Data**: Training datasets created from public sources and synthetic data
