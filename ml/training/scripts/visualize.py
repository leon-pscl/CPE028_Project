"""Shared visualization functions for model training results.

All functions save PNGs to the given save_path and close figures
to avoid memory leaks during training loops.
"""

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay, classification_report
from sklearn.preprocessing import label_binarize


def plot_confusion_matrix(y_true, y_pred, classes, save_path, title="Confusion Matrix"):
    """Heatmap confusion matrix."""
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(max(6, len(classes)), max(5, len(classes) - 1)))
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=classes)
    disp.plot(ax=ax, cmap="Blues", values_format="d")
    ax.set_title(title)
    plt.tight_layout()
    Path(save_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(save_path, dpi=150)
    plt.close(fig)


def plot_training_curves(train_losses, val_losses, train_accs, val_accs, save_path):
    """Loss and accuracy curves over epochs."""
    epochs = range(1, len(train_losses) + 1)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    ax1.plot(epochs, train_losses, "o-", label="Train")
    if val_losses:
        ax1.plot(epochs, val_losses, "s-", label="Validation")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Loss")
    ax1.set_title("Training Loss")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    ax2.plot(epochs, train_accs, "o-", label="Train")
    if val_accs:
        ax2.plot(epochs, val_accs, "s-", label="Validation")
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Accuracy")
    ax2.set_title("Training Accuracy")
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    Path(save_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(save_path, dpi=150)
    plt.close(fig)


def plot_roc_auc(y_true, y_scores, classes, save_path, title="ROC Curve"):
    """ROC curve — binary or multi-class (one-vs-rest)."""
    n_classes = len(classes)
    y_true_bin = label_binarize(y_true, classes=list(range(n_classes)))

    from sklearn.metrics import roc_curve, auc
    fig, ax = plt.subplots(figsize=(8, 6))

    if n_classes == 2:
        fpr, tpr, _ = roc_curve(y_true, y_scores[:, 1])
        roc_auc = auc(fpr, tpr)
        ax.plot(fpr, tpr, linewidth=2, label=f"AUC = {roc_auc:.3f}")
    else:
        colors = plt.cm.Set1(np.linspace(0, 1, n_classes))
        for i, (cls, color) in enumerate(zip(classes, colors)):
            fpr, tpr, _ = roc_curve(y_true_bin[:, i], y_scores[:, i])
            roc_auc = auc(fpr, tpr)
            ax.plot(fpr, tpr, color=color, linewidth=2, label=f"{cls} (AUC = {roc_auc:.3f})")

    ax.plot([0, 1], [0, 1], "k--", linewidth=1)
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title(title)
    ax.legend(loc="lower right")
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    Path(save_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(save_path, dpi=150)
    plt.close(fig)


def plot_per_class_pr(y_true, y_pred, classes, save_path, title="Per-Class Precision & Recall"):
    """Bar chart of per-class precision and recall."""
    from sklearn.metrics import precision_recall_fscore_support
    precision, recall, _, _ = precision_recall_fscore_support(y_true, y_pred, labels=classes)

    x = np.arange(len(classes))
    width = 0.35

    fig, ax = plt.subplots(figsize=(max(8, len(classes) * 1.2), 5))
    bars1 = ax.bar(x - width / 2, precision, width, label="Precision", color="#2196F3")
    bars2 = ax.bar(x + width / 2, recall, width, label="Recall", color="#FF9800")

    ax.set_xlabel("Class")
    ax.set_ylabel("Score")
    ax.set_title(title)
    ax.set_xticks(x)
    ax.set_xticklabels(classes, rotation=45, ha="right")
    ax.set_ylim(0, 1.1)
    ax.legend()
    ax.grid(True, alpha=0.3, axis="y")

    for bar in bars1:
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.02,
                f"{bar.get_height():.2f}", ha="center", va="bottom", fontsize=8)
    for bar in bars2:
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.02,
                f"{bar.get_height():.2f}", ha="center", va="bottom", fontsize=8)

    plt.tight_layout()
    Path(save_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(save_path, dpi=150)
    plt.close(fig)


def plot_regression_results(y_true, y_pred, save_path, title="Regression: Predicted vs Actual"):
    """Scatter plot of predicted vs actual + residual histogram."""
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    residuals = y_true - y_pred

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    ax1.scatter(y_true, y_pred, alpha=0.5, edgecolors="k", linewidth=0.5)
    min_val = min(y_true.min(), y_pred.min())
    max_val = max(y_true.max(), y_pred.max())
    ax1.plot([min_val, max_val], [min_val, max_val], "r--", linewidth=2, label="Perfect")
    ax1.set_xlabel("Actual")
    ax1.set_ylabel("Predicted")
    ax1.set_title(title)
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    ax2.hist(residuals, bins=30, edgecolor="black", alpha=0.7)
    ax2.axvline(0, color="r", linestyle="--", linewidth=2)
    ax2.set_xlabel("Residual (Actual - Predicted)")
    ax2.set_ylabel("Count")
    ax2.set_title("Residual Distribution")
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    Path(save_path).parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(save_path, dpi=150)
    plt.close(fig)
