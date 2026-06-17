from __future__ import annotations

import json
import re
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, VotingClassifier, VotingRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder
from sklearn.svm import LinearSVC
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "datasets"
PROCESS_DIR = DATA_DIR / "Data_processing"
MODEL_DIR = BASE_DIR.parent.parent / "models"
MODEL_DIR.mkdir(exist_ok=True)


def clean_text(value: object) -> str:
    if pd.isna(value):
        return ""
    text = str(value).lower()
    text = text.replace("\n", " ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_issue_df() -> pd.DataFrame:
    issue_df = pd.read_csv(DATA_DIR / "device_issue_dataset_2000.csv")
    issue_df = issue_df.rename(columns={"issue": "text", "label": "issue_label"})
    issue_df["source"] = "device_issue_dataset"
    issue_df["text_clean"] = issue_df["text"].apply(clean_text)
    issue_df["issue_label"] = issue_df["issue_label"].fillna("Unknown").astype(str).str.strip()
    return issue_df


def normalize_final_df() -> pd.DataFrame:
    final_df = pd.read_csv(DATA_DIR / "final_dataset.csv")
    final_df = final_df.rename(columns={"issue": "text", "predicted_label": "issue_label"})
    final_df["source"] = "final_dataset"
    final_df["text_clean"] = final_df["text"].apply(clean_text)
    final_df["issue_label"] = final_df["issue_label"].fillna("Unknown").astype(str).str.strip()
    return final_df


def build_issue_training_frame() -> pd.DataFrame:
    issue_df = pd.concat([normalize_issue_df(), normalize_final_df()], ignore_index=True)
    issue_df = issue_df[["text", "text_clean", "issue_label", "source"]].dropna(subset=["text_clean"])
    issue_df = issue_df[issue_df["issue_label"].astype(str).str.strip() != ""]
    issue_df.to_csv(PROCESS_DIR / "processed_issue_dataset.csv", index=False)
    return issue_df


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

    # Save a processed file for downstream use in the Data_processing folder.
    combined.to_csv(PROCESS_DIR / "processed_repairability_dataset.csv", index=False)
    return combined


def train_issue_model() -> dict:
    df = build_issue_training_frame()
    X_train, X_test, y_train, y_test = train_test_split(df[["text_clean", "source"]], df["issue_label"], test_size=0.2, random_state=42, stratify=df["issue_label"])

    print("  - Preprocessing text with TF-IDF...")
    pipeline = Pipeline([
        (
            "preprocess",
            ColumnTransformer([
                ("text", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_features=200), "text_clean"),
                ("source", OneHotEncoder(handle_unknown="ignore", sparse_output=False), ["source"]),
            ], remainder="drop"),
        ),
        (
            "model",
            VotingClassifier(
                estimators=[
                    ("svc", LinearSVC(C=1.0, class_weight="balanced", max_iter=1000)),
                    ("rf", RandomForestClassifier(n_estimators=100, random_state=42, class_weight="balanced_subsample", n_jobs=-1)),
                    ("logreg", LogisticRegression(max_iter=2000, class_weight="balanced")),
                ],
                voting="hard",
            ),
        ),
    ])

    print("  - Fitting voting classifier...")
    pipeline.fit(X_train, y_train)
    pred = pipeline.predict(X_test)
    metrics = {
        "accuracy": round(float(accuracy_score(y_test, pred)), 4),
        "sample_count": int(len(df)),
    }
    joblib.dump(pipeline, MODEL_DIR / "issue_classifier_voting.joblib")
    return metrics



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
    }
    joblib.dump(pipeline, MODEL_DIR / "repairability_voting_regressor.joblib")
    print(f"Repairability model saved. Metrics: {metrics}")
    return metrics


def main() -> None:
    print("=" * 70)
    print("Starting ML Model Training Pipeline")
    print("=" * 70)
    
    print("\n[1/3] Training Issue/Damage Classifier...")
    issue_metrics = train_issue_model()
    print(f"✓ Issue model trained. Accuracy: {issue_metrics['accuracy']}")
    
    print("\n[2/3] Training Repairability Scoring Model...")
    repair_metrics = train_repairability_model()
    print(f"✓ Repairability model trained. R²: {repair_metrics['r2']}, MAE: {repair_metrics['mae']}")
    
    summary = {
        "issue_model": issue_metrics,
        "repairability_model": repair_metrics,
        "processed_files": [
            str((PROCESS_DIR / "processed_issue_dataset.csv").relative_to(BASE_DIR)),
            str((PROCESS_DIR / "processed_repairability_dataset.csv").relative_to(BASE_DIR)),
        ],
        "saved_models": [
            str((MODEL_DIR / "issue_classifier_voting.joblib").relative_to(BASE_DIR)),
            str((MODEL_DIR / "repairability_voting_regressor.joblib").relative_to(BASE_DIR)),
        ],
    }
    (MODEL_DIR / "training_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    
    print("\n" + "=" * 70)
    print("Training Complete!")
    print("=" * 70)
    print("\nSummary:")
    print(json.dumps(summary, indent=2))



if __name__ == "__main__":
    main()
