import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
DATASETS_DIR = Path(__file__).resolve().parent.parent / "training" / "datasets"


@pytest.fixture(scope="session")
def issue_classifier():
    """Load issue classifier once per test session."""
    joblib_path = MODELS_DIR / "issue_classifier_voting.joblib"
    if not joblib_path.exists():
        pytest.skip("issue_classifier_voting.joblib not found — run: python training/scripts/train_issue_classifier.py")
    import joblib
    return joblib.load(joblib_path)


@pytest.fixture(scope="session")
def repairability_model():
    """Load repairability regressor once per test session."""
    joblib_path = MODELS_DIR / "repairability_voting_regressor.joblib"
    if not joblib_path.exists():
        pytest.skip("repairability_voting_regressor.joblib not found — run: python training/scripts/train_repairability_scorer.py")
    import joblib
    return joblib.load(joblib_path)


@pytest.fixture(scope="session")
def issue_sample_df():
    """Load and sample 100 rows from the issue test dataset."""
    csv_path = DATASETS_DIR / "pre_processed" / "processed_issue_dataset1.csv"
    if not csv_path.exists():
        pytest.skip("processed_issue_dataset1.csv not found")
    import pandas as pd
    df = pd.read_csv(csv_path)
    n = min(100, len(df))
    return df.sample(n, random_state=42)


@pytest.fixture(scope="session")
def repairability_sample_df():
    """Load and sample 100 rows from the repairability test dataset."""
    csv_path = DATASETS_DIR / "pre_processed" / "processed_repairability_dataset1.csv"
    if not csv_path.exists():
        pytest.skip("processed_repairability_dataset1.csv not found")
    import pandas as pd
    df = pd.read_csv(csv_path)
    n = min(100, len(df))
    return df.sample(n, random_state=42)
