from __future__ import annotations

import json
import re
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.svm import LinearSVC

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR.parent / "datasets"
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
    PROCESS_DIR.mkdir(parents=True, exist_ok=True)
    issue_df.to_csv(PROCESS_DIR / "processed_issue_dataset.csv", index=False)
    return issue_df


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
    report = classification_report(y_test, pred, output_dict=True)
    metrics = {
        "accuracy": round(float(accuracy_score(y_test, pred)), 4),
        "sample_count": int(len(df)),
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
        "classification_report": {
            k: round(v, 4) if isinstance(v, float) else v
            for k, v in report.items()
            if k not in ("macro avg", "weighted avg")
        },
    }
    joblib.dump(pipeline, MODEL_DIR / "issue_classifier_voting.joblib")
    return metrics


def main() -> None:
    print("=" * 70)
    print("Training Issue/Damage Classifier")
    print("=" * 70)

    metrics = train_issue_model()
    print(f"✓ Issue model trained. Accuracy: {metrics['accuracy']}")

    summary = {
        "issue_model": metrics,
        "saved_model": str((MODEL_DIR / "issue_classifier_voting.joblib").relative_to(BASE_DIR)),
        "versions": {
            "numpy": __import__("numpy").__version__,
            "sklearn": __import__("sklearn").__version__,
            "joblib": __import__("joblib").__version__,
            "pandas": __import__("pandas").__version__,
        },
    }

    results_path = RESULTS_DIR / "issue_classifier_results.json"
    results_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print("\n" + "=" * 70)
    print("Training Complete!")
    print("=" * 70)
    print(f"Results saved to {results_path}")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
