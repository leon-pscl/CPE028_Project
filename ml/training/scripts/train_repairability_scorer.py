from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor, VotingRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.tree import DecisionTreeRegressor

sys.path.insert(0, str(Path(__file__).resolve().parent))
from visualize import plot_regression_results

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "datasets" / "text"
PROCESS_DIR = DATA_DIR / "pre_processed"
MODEL_DIR = BASE_DIR.parent.parent / "models"
RESULTS_DIR = BASE_DIR.parent / "results"
MODEL_DIR.mkdir(exist_ok=True)
RESULTS_DIR.mkdir(exist_ok=True)


def clean_text(value: object) -> str:
    if pd.isna(value):
        return ""
    text = str(value).lower()
    text = text.replace("\n", " ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def build_repairability_frame() -> pd.DataFrame:
    repair_final = pd.read_csv(DATA_DIR / "repairability-final.csv")
    repair_final = repair_final.rename(columns={"Brand": "brand", "Model": "model", "Category": "category", "Vision Score": "repairability_score"})
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
    history = history.rename(columns={"Name": "brand", "Type": "category", "Problem": "problem", "fixed YES/NO": "fixed_flag"})
    history["source"] = "repair-history"
    history["device_text"] = history[["brand", "category", "problem"]].fillna("").astype(str).agg(lambda r: " ".join(r), axis=1)
    history["repairability_score"] = history["fixed_flag"].astype(str).str.upper().eq("YES").astype(float) * 8.0 + 2.0

    tech = pd.read_csv(DATA_DIR / "tech_gadget_failures.csv")
    tech = tech.rename(columns={"Device_Type": "category", "Brand": "brand", "Model_Name": "model", "Failure_Type": "failure_type", "Repair_Cost": "repair_cost", "Customer_Rating": "customer_rating", "Comments": "comments", "Usage_Duration": "usage_duration", "Warranty_Status": "warranty_status"})
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

    PROCESS_DIR.mkdir(parents=True, exist_ok=True)
    combined.to_csv(PROCESS_DIR / "processed_repairability_dataset.csv", index=False)
    return combined


def train_repairability_model() -> dict:
    df = build_repairability_frame()

    model_df = df.copy()
    model_df["repair_cost"] = pd.to_numeric(model_df.get("repair_cost", 0), errors="coerce").fillna(0)
    model_df["customer_rating"] = pd.to_numeric(model_df.get("customer_rating", 0), errors="coerce").fillna(0)
    model_df["usage_duration"] = pd.to_numeric(model_df.get("usage_duration", 0), errors="coerce").fillna(0)

    X = model_df[["device_text_clean", "source", "repair_cost", "customer_rating", "usage_duration"]]
    y = model_df["repairability_score"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

    numeric_features = ["repair_cost", "customer_rating", "usage_duration"]
    categorical_features = ["source"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("text", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=200), "device_text_clean"),
            ("num", "passthrough", numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features),
        ],
        remainder="drop",
    )

    estimator = VotingRegressor(
        estimators=[
            ("tree", DecisionTreeRegressor(max_depth=6, random_state=42)),
            ("forest", RandomForestRegressor(n_estimators=100, max_depth=6, random_state=42, n_jobs=-1)),
        ]
    )

    pipeline = Pipeline([("preprocess", preprocessor), ("model", estimator)])
    print("Fitting repairability model...")
    pipeline.fit(X_train, y_train)
    pred = pipeline.predict(X_test)

    metrics = {
        "mae": round(float(mean_absolute_error(y_test, pred)), 4),
        "r2": round(float(r2_score(y_test, pred)), 4),
        "sample_count": int(len(model_df)),
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
    }
    joblib.dump(pipeline, MODEL_DIR / "repairability_voting_regressor.joblib")
    print(f"Repairability model saved. Metrics: {metrics}")
    return metrics, y_test.tolist(), pred.tolist()


def main() -> None:
    print("=" * 70)
    print("Training Repairability Scoring Model")
    print("=" * 70)

    metrics, y_true, y_pred = train_repairability_model()
    print(f"✓ Repairability model trained. R²: {metrics['r2']}, MAE: {metrics['mae']}")

    print("\nGenerating visualizations...")
    plot_regression_results(y_true, y_pred, RESULTS_DIR / "repairability_scorer_regression.png", title="Repairability Scorer — Predicted vs Actual")
    print(f"✓ Visualizations saved to {RESULTS_DIR}")

    summary = {
        "repairability_model": metrics,
        "saved_model": str(MODEL_DIR / "repairability_voting_regressor.joblib"),
        "versions": {
            "numpy": __import__("numpy").__version__,
            "sklearn": __import__("sklearn").__version__,
            "joblib": __import__("joblib").__version__,
            "pandas": __import__("pandas").__version__,
        },
    }

    results_path = RESULTS_DIR / "repairability_scorer_results.json"
    results_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print("\n" + "=" * 70)
    print("Training Complete!")
    print("=" * 70)
    print(f"Results saved to {results_path}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
