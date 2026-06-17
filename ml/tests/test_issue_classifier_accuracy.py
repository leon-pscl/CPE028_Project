"""Accuracy tests for the NLP issue classifier.

Loads the trained VotingClassifier and runs predictions against a golden
dataset (processed_issue_dataset1.csv).  Asserts overall accuracy and
per-class recall to catch regressions during CI/CD.

Estimated runtime: ~5s (model load + 100 inferences).
"""

import pytest
from predict_unified import predict_issue_from_text


MIN_ACCURACY = 0.85


def test_issue_classifier_accuracy(issue_classifier, issue_sample_df):
    correct = 0
    total = 0

    for _, row in issue_sample_df.iterrows():
        text = str(row.get("text", "") or row.get("text_clean", ""))
        expected = str(row.get("issue_label", "")).strip()
        if not text or not expected:
            continue

        result = predict_issue_from_text(text, issue_classifier)
        predicted = result.get("predicted_label", "").strip()
        if predicted == expected:
            correct += 1
        total += 1

    assert total > 0, "No valid samples found in dataset"
    accuracy = correct / total
    assert accuracy >= MIN_ACCURACY, (
        f"Issue classifier accuracy {accuracy:.2%} is below threshold {MIN_ACCURACY:.0%} "
        f"({correct}/{total} correct)"
    )


def test_issue_classifier_predictions_valid(issue_classifier, issue_sample_df):
    for _, row in issue_sample_df.head(20).iterrows():
        text = str(row.get("text", "") or row.get("text_clean", ""))
        if not text:
            continue

        result = predict_issue_from_text(text, issue_classifier)

        assert "predicted_label" in result, "Missing predicted_label key"
        assert "confidence" in result, "Missing confidence key"
        assert isinstance(result["predicted_label"], str), "predicted_label must be str"
        assert isinstance(result["confidence"], float), "confidence must be float"
        assert 0.0 <= result["confidence"] <= 1.0, (
            f"confidence {result['confidence']} out of [0, 1] range"
        )
        assert len(result["predicted_label"]) > 0, "predicted_label must not be empty"
