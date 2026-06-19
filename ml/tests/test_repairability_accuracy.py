"""Accuracy tests for the NLP repairability regressor.

Loads the trained VotingRegressor and runs predictions against a golden
dataset (processed_repairability_dataset1.csv).  Asserts MAE and score
range to catch regressions during CI/CD.

Estimated runtime: ~5s (model load + 100 inferences).
"""

import pytest
import numpy as np
from predict_unified import predict_repairability


MAX_MAE = 1.5
MIN_SCORE = 1.0
MAX_SCORE = 10.0


def test_repairability_mae(repairability_model, repairability_sample_df):
    actuals = []
    predictions = []

    for _, row in repairability_sample_df.iterrows():
        device_text = str(row.get("device_text_clean", "") or row.get("device_text", ""))
        expected = row.get("repairability_score")
        if not device_text or expected is None or np.isnan(float(expected)):
            continue

        result = predict_repairability(
            device_text,
            repair_cost=row.get("repair_cost", 0),
            customer_rating=row.get("customer_rating", 0),
            usage_duration=row.get("usage_duration", 0),
        )
        actuals.append(float(expected))
        predictions.append(result["repairability_score"])

    assert len(actuals) > 0, "No valid samples found in dataset"
    mae = np.mean(np.abs(np.array(actuals) - np.array(predictions)))
    assert mae <= MAX_MAE, (
        f"Repairability MAE {mae:.4f} exceeds threshold {MAX_MAE} "
        f"({len(actuals)} samples)"
    )


def test_repairability_scores_in_range(repairability_model, repairability_sample_df):
    for _, row in repairability_sample_df.head(20).iterrows():
        device_text = str(row.get("device_text_clean", "") or row.get("device_text", ""))
        if not device_text:
            continue

        result = predict_repairability(device_text)
        score = result["repairability_score"]

        assert isinstance(score, float), "repairability_score must be float"
        assert MIN_SCORE <= score <= MAX_SCORE, (
            f"Score {score} outside [{MIN_SCORE}, {MAX_SCORE}] range"
        )
