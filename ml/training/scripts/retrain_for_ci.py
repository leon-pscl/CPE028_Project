#!/usr/bin/env python3
"""
Retrain ML models for CI. Run on Colab or locally.
Saves .joblib models + training_summary.json with metrics.
"""
import json
import re
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    RandomForestClassifier,
    RandomForestRegressor,
    VotingClassifier,
    VotingRegressor,
)
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    mean_absolute_error,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.svm import LinearSVC
from sklearn.tree import DecisionTreeRegressor

# ── paths ────────────────────────────────────────────────────────────
BASE_DIR = Path("/content/ml")
DATA_DIR = BASE_DIR / "datasets"
PROCESS_DIR = DATA_DIR / "Data_processing"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)
PROCESS_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)


def clean_text(value):
    if pd.isna(value):
        return ""
    text = str(value).lower()
    text = text.replace("\n", " ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ═══════════════════════════════════════════════════════════════════════
# 1. ISSUE CLASSIFIER
# ═══════════════════════════════════════════════════════════════════════
print("=" * 60)
print("1. Training Issue / Damage Classifier")
print("=" * 60)

issue_2k = pd.read_csv(DATA_DIR / "device_issue_dataset_2000.csv")
issue_2k = issue_2k.rename(columns={"issue": "text", "label": "issue_label"})
issue_2k["source"] = "device_issue_dataset"
issue_2k["text_clean"] = issue_2k["text"].apply(clean_text)
issue_2k["issue_label"] = issue_2k["issue_label"].fillna("Unknown").astype(str).str.strip()

final_df = pd.read_csv(DATA_DIR / "final_dataset.csv")
final_df = final_df.rename(columns={"issue": "text", "predicted_label": "issue_label"})
final_df["source"] = "final_dataset"
final_df["text_clean"] = final_df["text"].apply(clean_text)
final_df["issue_label"] = final_df["issue_label"].fillna("Unknown").astype(str).str.strip()

issue_df = pd.concat([issue_2k, final_df], ignore_index=True)
issue_df = issue_df[["text", "text_clean", "issue_label", "source"]].dropna(subset=["text_clean"])
issue_df = issue_df[issue_df["issue_label"].astype(str).str.strip() != ""]
print(f"Dataset: {len(issue_df)} rows, {issue_df['issue_label'].nunique()} labels")
print(f"Labels: {sorted(issue_df['issue_label'].unique())}")

X_train, X_test, y_train, y_test = train_test_split(
    issue_df[["text_clean", "source"]], issue_df["issue_label"],
    test_size=0.2, random_state=42, stratify=issue_df["issue_label"],
)

pipeline = Pipeline([
    ("preprocess", ColumnTransformer([
        ("text", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=200), "text_clean"),
        ("source", OneHotEncoder(handle_unknown="ignore", sparse_output=False), ["source"]),
    ], remainder="drop")),
    ("model", VotingClassifier(
        estimators=[
            ("svc", LinearSVC(C=1.0, class_weight="balanced", max_iter=1000)),
            ("rf", RandomForestClassifier(n_estimators=100, random_state=42,
                                          class_weight="balanced_subsample", n_jobs=-1)),
            ("logreg", LogisticRegression(max_iter=2000, class_weight="balanced")),
        ],
        voting="hard",
    )),
])

t0 = time.time()
pipeline.fit(X_train, y_train)
issue_elapsed = time.time() - t0
issue_pred = pipeline.predict(X_test)
issue_acc = accuracy_score(y_test, issue_pred)

print(f"\nTrained in {issue_elapsed:.1f}s")
print(f"Accuracy: {issue_acc:.4f}")
print()
print(classification_report(y_test, issue_pred))

# Save confusion matrix
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from sklearn.metrics import ConfusionMatrixDisplay

    labels = sorted(y_test.unique())
    cm = confusion_matrix(y_test, issue_pred, labels=labels)
    fig, ax = plt.subplots(figsize=(8, 6))
    ConfusionMatrixDisplay(cm, display_labels=labels).plot(ax=ax, cmap="Blues", xticks_rotation=45)
    ax.set_title("Issue Classifier — Confusion Matrix")
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "issue_confusion_matrix.png", dpi=150)
    plt.close()
    print(f"Saved {OUTPUT_DIR / 'issue_confusion_matrix.png'}")
except Exception as e:
    print(f"Could not save confusion matrix: {e}")

joblib.dump(pipeline, MODEL_DIR / "issue_classifier_voting.joblib")
print(f"Saved issue_classifier_voting.joblib")


# ═══════════════════════════════════════════════════════════════════════
# 2. REPAIRABILITY REGRESSOR
# ═══════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("2. Training Repairability Scoring Regressor")
print("=" * 60)

repair_final = pd.read_csv(DATA_DIR / "repairability-final.csv")
repair_final = repair_final.rename(columns={
    "Brand": "brand", "Model": "model", "Category": "category",
    "Vision Score": "repairability_score",
})
repair_final["source"] = "repairability-final"
repair_final["device_text"] = repair_final[["brand", "model", "category"]].fillna("").astype(str).agg(lambda r: " ".join(r), axis=1)
repair_final["repairability_score"] = pd.to_numeric(repair_final["repairability_score"], errors="coerce")

ifixit = pd.read_csv(DATA_DIR / "iFixit Repairability Scores (Public) - Smartphones.csv")
ifixit = ifixit.rename(columns={"OEM": "brand", "Device": "model", "Score": "repairability_score"})
ifixit["category"] = "Smartphone"
ifixit["source"] = "ifixit"
ifixit["device_text"] = ifixit[["brand", "model", "category"]].fillna("").astype(str).agg(lambda r: " ".join(r), axis=1)
ifixit["repairability_score"] = pd.to_numeric(ifixit["repairability_score"], errors="coerce")

history = pd.read_csv(DATA_DIR / "Repair-History.csv")
history = history.rename(columns={
    "Name": "brand", "Type": "category", "Problem": "problem",
    "fixed YES/NO": "fixed_flag",
})
history["source"] = "repair-history"
history["device_text"] = history[["brand", "category", "problem"]].fillna("").astype(str).agg(lambda r: " ".join(r), axis=1)
history["repairability_score"] = history["fixed_flag"].astype(str).str.upper().eq("YES").astype(float) * 8.0 + 2.0

tech = pd.read_csv(DATA_DIR / "tech_gadget_failures.csv")
tech = tech.rename(columns={
    "Device_Type": "category", "Brand": "brand", "Model_Name": "model",
    "Failure_Type": "failure_type", "Repair_Cost": "repair_cost",
    "Customer_Rating": "customer_rating", "Comments": "comments",
    "Usage_Duration": "usage_duration", "Warranty_Status": "warranty_status",
})
tech["source"] = "tech-gadget-failures"
tech["device_text"] = tech[["brand", "model", "category", "failure_type", "comments"]].fillna("").astype(str).agg(lambda r: " ".join(r), axis=1)
tech["repairability_score"] = (
    10.0
    - (tech["repair_cost"].fillna(0) / 1200.0)
    - (tech["customer_rating"].fillna(5) < 3).astype(int) * 1.4
    - (tech["warranty_status"].astype(str).str.upper().eq("NO")).astype(int) * 0.5
).clip(1.0, 10.0)

laptop = pd.read_csv(DATA_DIR / "laptop_dataset_final.csv", low_memory=False)
laptop = laptop.rename(columns={"Brand": "brand", "Model": "model", "Series": "series", "Price (Rs)": "price"})
laptop["source"] = "laptop-dataset"
laptop["category"] = "Laptop"
laptop["device_text"] = laptop[["brand", "model", "series", "category"]].fillna("").astype(str).agg(lambda r: " ".join(r), axis=1)
laptop["repairability_score"] = (5.0 + (pd.to_numeric(laptop["price"], errors="coerce").fillna(0) / 20000.0)).clip(1.0, 10.0)
laptop = laptop.sample(min(2000, len(laptop)), random_state=42)

combined = pd.concat([repair_final, ifixit, history, tech.sample(min(3000, len(tech)), random_state=42), laptop], ignore_index=True)
combined["repairability_score"] = pd.to_numeric(combined["repairability_score"], errors="coerce")
combined["device_text_clean"] = combined["device_text"].apply(clean_text)
combined = combined.dropna(subset=["repairability_score"])
print(f"Dataset: {len(combined)} rows")

model_df = combined.copy()
model_df["repair_cost"] = pd.to_numeric(model_df.get("repair_cost", 0), errors="coerce").fillna(0)
model_df["customer_rating"] = pd.to_numeric(model_df.get("customer_rating", 0), errors="coerce").fillna(0)
model_df["usage_duration"] = pd.to_numeric(model_df.get("usage_duration", 0), errors="coerce").fillna(0)

X = model_df[["device_text_clean", "source", "repair_cost", "customer_rating", "usage_duration"]]
y = model_df["repairability_score"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

preprocessor = ColumnTransformer(transformers=[
    ("text", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=200), "device_text_clean"),
    ("num", "passthrough", ["repair_cost", "customer_rating", "usage_duration"]),
    ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), ["source"]),
], remainder="drop")

rpipe = Pipeline([
    ("preprocess", preprocessor),
    ("model", VotingRegressor(estimators=[
        ("tree", DecisionTreeRegressor(max_depth=6, random_state=42)),
        ("forest", RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42, n_jobs=-1)),
    ])),
])

t0 = time.time()
rpipe.fit(X_train, y_train)
rep_elapsed = time.time() - t0
rep_pred = rpipe.predict(X_test)
mae = mean_absolute_error(y_test, rep_pred)
r2 = r2_score(y_test, rep_pred)

print(f"\nTrained in {rep_elapsed:.1f}s")
print(f"R²: {r2:.4f}  MAE: {mae:.4f}")

# Save plots
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    axes[0].scatter(y_test, rep_pred, alpha=0.3, s=10)
    axes[0].plot([y.min(), y.max()], [y.min(), y.max()], "r--", lw=1.5)
    axes[0].set_xlabel("Actual")
    axes[0].set_ylabel("Predicted")
    axes[0].set_title(f"Predicted vs Actual (R²={r2:.4f})")
    residuals = y_test.values - rep_pred
    axes[1].hist(residuals, bins=40, edgecolor="black", alpha=0.7)
    axes[1].axvline(0, color="r", linestyle="--", lw=1.5)
    axes[1].set_xlabel("Residual")
    axes[1].set_ylabel("Count")
    axes[1].set_title(f"Residual Distribution (MAE={mae:.4f})")
    plt.tight_layout()
    fig.savefig(OUTPUT_DIR / "repairability_metrics.png", dpi=150)
    plt.close()
    print(f"Saved {OUTPUT_DIR / 'repairability_metrics.png'}")
except Exception as e:
    print(f"Could not save plots: {e}")

joblib.dump(rpipe, MODEL_DIR / "repairability_voting_regressor.joblib")
print(f"Saved repairability_voting_regressor.joblib")


# ═══════════════════════════════════════════════════════════════════════
# 3. SAVE SUMMARY
# ═══════════════════════════════════════════════════════════════════════
import sklearn

summary = {
    "issue_model": {
        "accuracy": round(float(issue_acc), 4),
        "sample_count": int(len(issue_df)),
    },
    "repairability_model": {
        "r2": round(float(r2), 4),
        "mae": round(float(mae), 4),
        "sample_count": int(len(combined)),
    },
    "versions": {
        "numpy": np.__version__,
        "sklearn": sklearn.__version__,
        "joblib": joblib.__version__,
    },
}

summary_path = MODEL_DIR / "training_summary.json"
summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
print(json.dumps(summary, indent=2))
print(f"\nModels: {MODEL_DIR}/")
print(f"Plots:  {OUTPUT_DIR}/")
