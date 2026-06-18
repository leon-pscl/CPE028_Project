"""
Image Classification Training - Laptop Components
=================================================

Uses the "Laptop Components Image Dataset" to train an image classifier
for identifying damaged laptop components.

Components trained:
1. Battery, 2. LCDScreen, 3. Keyboard, 4. Hinge, 5. Motherboard,
6. HardDiskDrive, 7. RAM, 8. Processor, 9. WebCam, 10. TouchPad
"""

import sys
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from pathlib import Path
import json
from tqdm import tqdm
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from visualize import plot_confusion_matrix, plot_training_curves, plot_roc_auc, plot_per_class_pr

# ============ CONFIGURATION ============

DATASET_ROOT = Path(__file__).resolve().parent.parent / "datasets" / "image" / "Laptop Components Image Dataset to Classify Different Components" / "Raw Data" / "Raw Data"
MODEL_OUTPUT_PATH = Path(__file__).resolve().parent.parent.parent / "models" / "image_classifier_laptop.pth"
RESULTS_DIR = Path(__file__).resolve().parent.parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)

COMPONENTS = [
    "Battery", "LCDScreen", "Keyboard", "Hinge", "Motherboard",
    "HardDiskDrive", "RAM", "Processor", "WebCam", "TouchPad",
]

IMG_SIZE = 224
BATCH_SIZE = 32
NUM_EPOCHS = 20
LEARNING_RATE = 0.001
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ============ DATA TRANSFORMS ============

transform_train = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

transform_val = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# ============ MODEL ============

class LaptopComponentClassifier(nn.Module):
    def __init__(self, num_classes=10):
        super().__init__()
        self.backbone = models.resnet18(weights="DEFAULT")
        self.backbone.fc = nn.Linear(self.backbone.fc.in_features, num_classes)

    def forward(self, x):
        return self.backbone(x)

# ============ CUSTOM DATASET ============

class ComponentDataset(Dataset):
    """Loads images from numbered folders (e.g. '1. Battery/', '3. Hinge/')."""

    def __init__(self, image_paths, labels, transform=None):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img = Image.open(self.image_paths[idx]).convert("RGB")
        label = self.labels[idx]
        if self.transform:
            img = self.transform(img)
        return img, label

# ============ DATA LOADING ============

def discover_images():
    """Find images in numbered component folders, return (paths, labels)."""
    if not DATASET_ROOT.exists():
        print(f"❌ Dataset not found: {DATASET_ROOT}")
        return None, None

    component_map = {}
    for idx, component in enumerate(COMPONENTS):
        for folder in DATASET_ROOT.iterdir():
            if folder.is_dir() and component.lower() in folder.name.lower():
                component_map[idx] = folder
                print(f"✓ {component}: {folder.name}")
                break

    if len(component_map) < len(COMPONENTS):
        found = [COMPONENTS[i] for i in component_map]
        missing = [c for c in COMPONENTS if c not in found]
        print(f"⚠ Missing components: {missing}")

    paths, labels = [], []
    for label_idx, folder in component_map.items():
        for ext in ("*.jpg", "*.jpeg", "*.png"):
            for img_path in folder.glob(ext):
                paths.append(str(img_path))
                labels.append(label_idx)

    print(f"\nTotal: {len(paths)} images across {len(component_map)} classes")
    return paths, labels

# ============ TRAINING ============

def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for images, labels in tqdm(loader, desc="Training"):
        images, labels = images.to(device), labels.to(device)
        outputs = model(images)
        loss = criterion(outputs, labels)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
        correct += (outputs.argmax(1) == labels).sum().item()
        total += labels.size(0)
    return total_loss / len(loader), correct / total


def validate_epoch(model, loader, criterion, device):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    all_preds, all_labels = [], []
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)
            total_loss += loss.item()
            preds = outputs.argmax(1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
    return total_loss / len(loader), correct / total, all_preds, all_labels


def train_component_classifier():
    print("=" * 60)
    print("Training Component Classifier")
    print("=" * 60)

    model = LaptopComponentClassifier(num_classes=len(COMPONENTS)).to(DEVICE)
    print(f"Device: {DEVICE} | Classes: {len(COMPONENTS)}")

    paths, labels = discover_images()
    if paths is None:
        return None

    train_paths, val_paths, train_labels, val_labels = train_test_split(
        paths, labels, test_size=0.2, random_state=42, stratify=labels
    )
    print(f"Train: {len(train_paths)} | Val: {len(val_paths)}")

    train_loader = DataLoader(
        ComponentDataset(train_paths, train_labels, transform_train),
        batch_size=BATCH_SIZE, shuffle=True, num_workers=0,
    )
    val_loader = DataLoader(
        ComponentDataset(val_paths, val_labels, transform_val),
        batch_size=BATCH_SIZE, shuffle=False, num_workers=0,
    )

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.1)

    best_accuracy = 0.0
    train_losses, train_accs, val_losses, val_accs = [], [], [], []

    for epoch in range(NUM_EPOCHS):
        print(f"\nEpoch {epoch + 1}/{NUM_EPOCHS}")
        t_loss, t_acc = train_epoch(model, train_loader, criterion, optimizer, DEVICE)
        v_loss, v_acc, _, _ = validate_epoch(model, val_loader, criterion, DEVICE)

        train_losses.append(t_loss)
        train_accs.append(t_acc)
        val_losses.append(v_loss)
        val_accs.append(v_acc)

        print(f"  Train Loss: {t_loss:.4f} | Acc: {t_acc:.4f}")
        print(f"  Val   Loss: {v_loss:.4f} | Acc: {v_acc:.4f}")

        if v_acc > best_accuracy:
            best_accuracy = v_acc
            torch.save(model.state_dict(), MODEL_OUTPUT_PATH)
            print(f"  ✓ Best accuracy: {best_accuracy:.4f}")

        scheduler.step()

    # Final evaluation on validation set
    print("\n" + "=" * 60)
    print("EVALUATION")
    print("=" * 60)

    model.load_state_dict(torch.load(MODEL_OUTPUT_PATH, map_location=DEVICE, weights_only=True))
    _, test_acc, test_preds, test_labels = validate_epoch(model, val_loader, criterion, DEVICE)
    print(f"Validation Accuracy: {test_acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(test_labels, test_preds, target_names=COMPONENTS))

    # Visualizations
    print("\nGenerating visualizations...")
    plot_confusion_matrix(test_labels, test_preds, COMPONENTS, RESULTS_DIR / "component_classifier_confusion_matrix.png", title="Component Classifier — Confusion Matrix")
    plot_training_curves(train_losses, val_losses, train_accs, val_accs, RESULTS_DIR / "component_classifier_training_curves.png")
    plot_per_class_pr(test_labels, test_preds, COMPONENTS, RESULTS_DIR / "component_classifier_per_class_pr.png", title="Component Classifier — Per-Class Precision & Recall")

    # ROC-AUC
    all_scores = []
    model.eval()
    with torch.no_grad():
        for images, _ in val_loader:
            outputs = model(images.to(DEVICE))
            all_scores.extend(torch.softmax(outputs, dim=1).cpu().numpy())
    plot_roc_auc(test_labels, np.array(all_scores), COMPONENTS, RESULTS_DIR / "component_classifier_roc_auc.png", title="Component Classifier — ROC Curve")
    print(f"✓ Visualizations saved to {RESULTS_DIR}")

    # Save metadata
    metadata = {
        "model_type": "ResNet18 (Multi-Class Classifier)",
        "task": "Laptop Component Classification",
        "num_classes": len(COMPONENTS),
        "classes": COMPONENTS,
        "image_size": IMG_SIZE,
        "training_epochs": NUM_EPOCHS,
        "learning_rate": LEARNING_RATE,
        "best_accuracy": float(best_accuracy),
        "test_accuracy": float(test_acc),
        "classification_report": classification_report(test_labels, test_preds, target_names=COMPONENTS, output_dict=True),
        "confusion_matrix": confusion_matrix(test_labels, test_preds).tolist(),
        "device": str(DEVICE),
        "dataset": {"train": len(train_paths), "val": len(val_paths)},
    }
    results_path = RESULTS_DIR / "component_classifier_results.json"
    results_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"✓ Metadata saved to {results_path}")

    return model


if __name__ == "__main__":
    model = train_component_classifier()
    if model:
        print("\n" + "=" * 60)
        print("✅ Component classifier training complete!")
        print("=" * 60)
